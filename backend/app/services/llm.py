import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from openai import (
    OpenAI,
    APIConnectionError,
    RateLimitError,
    APIStatusError,
    APITimeoutError,
)

from app.config import settings

logger = logging.getLogger("ai_assistant.llm")
logging.basicConfig(level=logging.INFO)


class LLMResponse:
    def __init__(
        self,
        content: str,
        model: str,
        is_success: bool = True,
        error_message: Optional[str] = None,
        usage: Optional[Dict[str, Any]] = None,
        is_configured: bool = True,
    ):
        self.content = content
        self.model = model
        self.is_success = is_success
        self.error_message = error_message
        self.usage = usage or {}
        self.is_configured = is_configured

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "model": self.model,
            "is_success": self.is_success,
            "error_message": self.error_message,
            "usage": self.usage,
            "is_configured": self.is_configured,
        }


class BaseLLMProvider(ABC):
    """Abstract interface for modular LLM provider integration."""

    @abstractmethod
    def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.4,
    ) -> LLMResponse:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


class QwenLLMService(BaseLLMProvider):
    """
    Qwen LLM Provider configured for Qwen/Qwen3-Next-80B-A3B-Instruct.

    Connects via Hugging Face's official OpenAI-compatible inference router
    (https://router.huggingface.co/v1) or any OpenAI-compatible provider/endpoint.
    """

    def __init__(self):
        self.api_key = settings.active_llm_api_key
        self.model = settings.active_llm_model
        self.base_url = settings.active_llm_base_url
        self.timeout = getattr(settings, "LLM_TIMEOUT_SECONDS", 60.0)

        self._client: Optional[OpenAI] = None

        if (
            self.api_key
            and not self.api_key.startswith("your-")
            and not self.api_key.startswith("hf_placeholder")
        ):
            try:
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                    timeout=self.timeout,
                )

                logger.info(
                    "Qwen LLM client initialized successfully (model: %s, base_url: %s).",
                    self.model,
                    self.base_url,
                )

            except Exception:
                logger.exception("Failed to initialize Qwen LLM client.")
                self._client = None

    def is_available(self) -> bool:
        return self._client is not None

    def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 1200,
        temperature: float = 0.3,
    ) -> LLMResponse:

        if not self.is_available():
            logger.warning(
                "LLM API key is not configured or client initialization failed."
            )

            return LLMResponse(
                content=(
                    "AI Service Notice: Hugging Face API key (HF_TOKEN) is not configured.\n\n"
                    "To enable Qwen/Qwen3-Next-80B-A3B-Instruct, get a free access token from "
                    "https://huggingface.co/settings/tokens and add it to your .env file:\n\n"
                    "HF_TOKEN=hf_your_token_here\n\n"
                    "Then restart your backend server."
                ),
                model=self.model,
                is_success=False,
                is_configured=False,
                error_message="HF_TOKEN / LLM_API_KEY is not configured.",
            )

        full_messages = []

        if system_prompt:
            full_messages.append(
                {
                    "role": "system",
                    "content": system_prompt,
                }
            )

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role not in ("system", "user", "assistant"):
                logger.warning("Skipping unsupported message role: %s", role)
                continue

            full_messages.append(
                {
                    "role": role,
                    "content": content,
                }
            )

        start_time = time.time()

        try:
            logger.info(
                "Calling Qwen model '%s' via %s with %s messages...",
                self.model,
                self.base_url,
                len(full_messages),
            )

            response = self._client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            elapsed = round(time.time() - start_time, 2)

            logger.info(
                "Qwen completion succeeded in %s seconds.",
                elapsed,
            )

            choice = response.choices[0]

            usage_dict = {
                "prompt_tokens": (
                    response.usage.prompt_tokens
                    if response.usage
                    else 0
                ),
                "completion_tokens": (
                    response.usage.completion_tokens
                    if response.usage
                    else 0
                ),
                "total_tokens": (
                    response.usage.total_tokens
                    if response.usage
                    else 0
                ),
                "elapsed_seconds": elapsed,
            }

            return LLMResponse(
                content=choice.message.content or "",
                model=self.model,
                is_success=True,
                is_configured=True,
                usage=usage_dict,
            )

        except RateLimitError as e:
            logger.error("LLM rate limit or quota error: %s", e)

            return LLMResponse(
                content=(
                    "The model provider rate limit or quota was reached. "
                    "Please wait a moment and try again."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Rate limit or quota error: {str(e)}",
            )

        except APITimeoutError as e:
            logger.error("LLM API request timed out: %s", e)

            return LLMResponse(
                content=(
                    "The request to the model provider timed out. "
                    "Please try again with a shorter query."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Timeout: {str(e)}",
            )

        except APIConnectionError as e:
            logger.error("Could not connect to LLM API endpoint: %s", e)

            return LLMResponse(
                content=(
                    "Could not connect to the model API provider. "
                    "Please check your network connection and API base URL."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Connection error: {str(e)}",
            )

        except APIStatusError as e:
            logger.error(
                "LLM API returned status %s: %s",
                e.status_code,
                e.message,
            )

            return LLMResponse(
                content=(
                    f"Model API returned error ({e.status_code}): {e.message}. "
                    "Check the backend logs for details."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Status {e.status_code}: {e.message}",
            )

        except Exception as e:
            logger.exception("Unexpected error in Qwen LLM service.")

            return LLMResponse(
                content=(
                    "An unexpected error occurred while "
                    "communicating with the LLM service."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=str(e),
            )


# Backward-compatibility alias
GeminiLLMService = QwenLLMService


def get_llm_service() -> BaseLLMProvider:
    """Return the configured Qwen provider."""
    return QwenLLMService()