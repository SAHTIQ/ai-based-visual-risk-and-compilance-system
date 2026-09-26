import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from openai import OpenAI, APIConnectionError, RateLimitError, APIStatusError, APITimeoutError
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
        usage: Optional[Dict[str, int]] = None,
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
    """Abstract interface to keep provider integration modular for future LLMs."""

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


class OpenAILLMService(BaseLLMProvider):
    """
    Official OpenAI Python SDK provider implementation with timeout handling,
    rate limit protection, logging, and unconfigured state handling.
    """

    def __init__(self):
        self.api_key = (settings.OPENAI_API_KEY or "").strip()
        self.model = settings.OPENAI_MODEL or "gpt-4o-mini"
        self.base_url = settings.OPENAI_BASE_URL
        self.timeout = settings.OPENAI_TIMEOUT_SECONDS or 30.0

        self._client: Optional[OpenAI] = None
        if self.api_key and not self.api_key.startswith("your-openai-api-key"):
            try:
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                    timeout=self.timeout,
                )
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
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
            logger.warning("OpenAI API key not configured or client initialization failed.")
            return LLMResponse(
                content=(
                    "⚠️ **AI Service Notice**: OpenAI API key is not configured.\n\n"
                    "To enable live OpenAI generation, set `OPENAI_API_KEY=your_key` in `backend/.env` and restart the backend server.\n\n"
                    "The backend data grounding, conversation memory, and risk analytics pipelines are fully operational."
                ),
                model=self.model,
                is_success=False,
                is_configured=False,
                error_message="OPENAI_API_KEY not configured in backend/.env",
            )

        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        for msg in messages:
            full_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        start_time = time.time()
        try:
            logger.info(f"Calling OpenAI model '{self.model}' with {len(full_messages)} messages...")
            response = self._client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            elapsed = round(time.time() - start_time, 2)
            logger.info(f"OpenAI completion succeeded in {elapsed}s.")

            choice = response.choices[0]
            usage_dict = {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
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
            logger.error(f"OpenAI Rate limit exceeded: {e}")
            return LLMResponse(
                content="Rate limit reached with the OpenAI service. Please wait a moment before asking another question.",
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Rate limit exceeded: {str(e)}",
            )
        except APITimeoutError as e:
            logger.error(f"OpenAI API request timed out: {e}")
            return LLMResponse(
                content="The request to OpenAI timed out. Please try again with a shorter query.",
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Timeout: {str(e)}",
            )
        except APIConnectionError as e:
            logger.error(f"Could not connect to OpenAI API: {e}")
            return LLMResponse(
                content="Could not connect to the OpenAI API endpoint. Please check network connectivity.",
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Connection error: {str(e)}",
            )
        except APIStatusError as e:
            logger.error(f"OpenAI API returned status {e.status_code}: {e.message}")
            return LLMResponse(
                content=f"OpenAI API error ({e.status_code}): {e.message}",
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=f"Status {e.status_code}: {e.message}",
            )
        except Exception as e:
            logger.error(f"Unexpected error in LLM service: {e}", exc_info=True)
            return LLMResponse(
                content=f"An unexpected error occurred while communicating with the AI service: {str(e)}",
                model=self.model,
                is_success=False,
                is_configured=True,
                error_message=str(e),
            )


# Default factory function to get the configured provider
def get_llm_service() -> BaseLLMProvider:
    return OpenAILLMService()
