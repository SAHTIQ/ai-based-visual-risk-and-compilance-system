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


class GeminiLLMService(BaseLLMProvider):
    """
    Gemini provider using Google's OpenAI-compatible API endpoint.

    Keeps the existing OpenAI SDK client interface while sending
    requests to Google's Gemini API.
    """

    def __init__(self):
        self.api_key = (settings.GEMINI_API_KEY or "").strip()
        self.model = settings.GEMINI_MODEL or "gemini-3.8-flash"
        self.base_url = (
            settings.GEMINI_BASE_URL
            or "https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        self.timeout = settings.GEMINI_TIMEOUT_SECONDS or 30.0

        self._client: Optional[OpenAI] = None

        if (
            self.api_key
            and not self.api_key.startswith("your-gemini-api-key")
        ):
            try:
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                    timeout=self.timeout,
                )

                logger.info("Gemini client initialized successfully.")

            except Exception:
                logger.exception("Failed to initialize Gemini client.")
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
                "Gemini API key is not configured or client initialization failed."
            )

            return LLMResponse(
                content=(
                    "AI Service Notice: Gemini API key is not configured.\n\n"
                    "Set GEMINI_API_KEY in your backend .env file "
                    "and restart the backend server."
                ),
                model=self.model,
                is_success=False,
                is_configured=False,
                error_message="GEMINI_API_KEY is not configured.",
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
                "Calling Gemini model '%s' with %s messages...",
                self.model,
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
                "Gemini completion succeeded in %s seconds.",
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
            logger.error("Gemini rate limit or quota error: %s", e)

            return LLMResponse(
                content=(
                    "The Gemini API rate limit or quota was reached. "
                    "Check your Gemini API usage and try again later."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Gemini rate limit or quota error: {str(e)}",
            )

        except APITimeoutError as e:
            logger.error("Gemini API request timed out: %s", e)

            return LLMResponse(
                content=(
                    "The request to Gemini timed out. "
                    "Please try again with a shorter query."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Timeout: {str(e)}",
            )

        except APIConnectionError as e:
            logger.error("Could not connect to Gemini API: %s", e)

            return LLMResponse(
                content=(
                    "Could not connect to the Gemini API. "
                    "Please check your network connection."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Connection error: {str(e)}",
            )

        except APIStatusError as e:
            logger.error(
                "Gemini API returned status %s: %s",
                e.status_code,
                e.message,
            )

            return LLMResponse(
                content=(
                    f"Gemini API error ({e.status_code}). "
                    "Check the backend logs for details."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Status {e.status_code}: {e.message}",
            )

        except Exception as e:
            logger.exception("Unexpected error in Gemini LLM service.")

            return LLMResponse(
                content=(
                    "An unexpected error occurred while "
                    "communicating with the Gemini service."
                ),
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=str(e),
            )


def get_llm_service() -> BaseLLMProvider:
    """Return the configured Gemini provider."""
    return GeminiLLMService()