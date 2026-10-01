import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

try:
    from openai import (
        OpenAI,
        APIConnectionError,
        RateLimitError,
        APIStatusError,
        APITimeoutError,
    )
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    OpenAI = None
    APIConnectionError = Exception
    RateLimitError = Exception
    APIStatusError = Exception
    APITimeoutError = Exception

from app.config import settings

logger = logging.getLogger("ai_assistant.llm")
logging.basicConfig(level=logging.INFO)

USER_FRIENDLY_UNAVAILABLE_MSG = (
    "AI service is temporarily unavailable. Please try again later."
)


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
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        is_complex: Optional[bool] = None,
    ) -> LLMResponse:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


class UnifiedLLMService(BaseLLMProvider):
    """
    Configurable, production-ready LLM service supporting multiple providers
    (Hugging Face, Gemini, OpenAI, or local/custom endpoints via OpenAI-compatible APIs).

    Features:
    - Environment-driven provider & model configuration
    - Lightweight model routing: fast/cheap model for normal requests, strong model for complex queries
    - Conservative output token budgeting
    - User-friendly error shielding with comprehensive server-side diagnostic logging
    """

    COMPLEXITY_PATTERNS = [
        re.compile(p, re.IGNORECASE)
        for p in [
            r"\bcompare\b.*\b(past|previous|historical|trend|week)\b",
            r"\bcorrelat(ion|e|ed)?\b",
            r"\btrade[- ]?off\b",
            r"\bmulti[- ]?step\b",
            r"\bdeep[- ]?dive\b",
            r"\bwhat[- ]?if\b.*\b(burnout|runway|spending|habit)\b",
            r"\bsimulat(ion|e|ed)?\b.*\b(trajectory|impact|scenario)\b",
            r"\bcomplex\b",
            r"\bhow does my .+ affect my .+\b",
        ]
    ]

    def __init__(self):
        self.provider = settings.resolved_llm_provider
        self.api_key = settings.active_llm_api_key
        self.primary_model = settings.active_llm_model
        self.fast_model = settings.active_llm_fast_model
        self.base_url = settings.active_llm_base_url
        self.timeout = getattr(settings, "LLM_TIMEOUT_SECONDS", 45.0)

        self._client: Optional[OpenAI] = None

        if (
            HAS_OPENAI
            and self.api_key
            and not self.api_key.startswith("your-")
            and not self.api_key.startswith("hf_placeholder")
            and not self.api_key.startswith("gemini_placeholder")
        ):
            try:
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                    timeout=self.timeout,
                )
                logger.info(
                    "Unified LLM client initialized successfully (provider: %s, model: %s, fast: %s, base_url: %s).",
                    self.provider,
                    self.primary_model,
                    self.fast_model,
                    self.base_url,
                )
            except Exception:
                logger.exception("Failed to initialize Unified LLM client.")
                self._client = None
        else:
            logger.info("LLM service initialized without active credentials (dry-run/fallback mode).")

    def is_available(self) -> bool:
        return self._client is not None

    def classify_query_complexity(self, query: str, history_len: int = 0) -> bool:
        """
        Determine whether a query warrants routing to the stronger model.
        Normal queries (lookups, greetings, weekly summaries, scores) use the fast model.
        """
        if not query:
            return False

        # Long multi-turn reasoning or long query prompt
        if len(query) > 280 or query.count("?") > 2:
            return True

        # Check for complex pattern matches
        for pat in self.COMPLEXITY_PATTERNS:
            if pat.search(query):
                return True

        return False

    def select_model(self, is_complex: bool, override_model: Optional[str] = None) -> str:
        """Route to appropriate model based on query complexity."""
        if override_model:
            return override_model
        if is_complex:
            return self.primary_model
        return self.fast_model

    def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        is_complex: Optional[bool] = None,
    ) -> LLMResponse:
        # 1. Determine complexity and model
        last_user_query = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_query = m.get("content", "")
                break

        if is_complex is None:
            is_complex = self.classify_query_complexity(last_user_query, len(messages))

        target_model = self.select_model(is_complex)

        # 2. Token and temperature limits
        configured_max = getattr(settings, "LLM_MAX_OUTPUT_TOKENS", 800)
        if max_tokens is None:
            # Conservative output for normal conversational requests, higher for complex
            max_tokens = configured_max if is_complex else min(500, configured_max)
        else:
            max_tokens = min(max_tokens, configured_max)

        if temperature is None:
            temperature = getattr(settings, "LLM_TEMPERATURE", 0.3)

        # 3. Check client readiness
        if not self.is_available():
            logger.warning(
                "LLM credentials not configured or client initialization failed for provider '%s'.",
                self.provider,
            )
            return LLMResponse(
                content=USER_FRIENDLY_UNAVAILABLE_MSG,
                model=target_model,
                is_success=False,
                is_configured=False,
                error_message=f"LLM credentials not configured for provider '{self.provider}'.",
            )

        # 4. Construct messages payload
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("system", "user", "assistant"):
                full_messages.append({"role": role, "content": content})

        start_time = time.time()

        try:
            logger.info(
                "Calling LLM [%s] (model: '%s', complex=%s, max_tokens=%d) with %d messages...",
                self.provider,
                target_model,
                is_complex,
                max_tokens,
                len(full_messages),
            )

            response = self._client.chat.completions.create(
                model=target_model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            elapsed = round(time.time() - start_time, 2)
            logger.info("LLM generation succeeded in %s seconds.", elapsed)

            choice = response.choices[0]
            usage_dict = {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
                "elapsed_seconds": elapsed,
            }

            return LLMResponse(
                content=choice.message.content or "",
                model=target_model,
                is_success=True,
                is_configured=True,
                usage=usage_dict,
            )

        except RateLimitError as e:
            logger.error("LLM rate limit or quota error: %s", e)
            return LLMResponse(
                content="The AI service is currently experiencing high volume. Please wait a moment and try again.",
                model=target_model,
                is_success=False,
                is_configured=True,
                error_message=f"Rate limit error: {str(e)}",
            )

        except APITimeoutError as e:
            logger.error("LLM API request timed out: %s", e)
            return LLMResponse(
                content="The request timed out. Please try asking a more specific question.",
                model=target_model,
                is_success=False,
                is_configured=True,
                error_message=f"Timeout: {str(e)}",
            )

        except APIConnectionError as e:
            logger.error("Could not connect to LLM API endpoint (%s): %s", self.base_url, e)
            return LLMResponse(
                content=USER_FRIENDLY_UNAVAILABLE_MSG,
                model=target_model,
                is_success=False,
                is_configured=True,
                error_message=f"Connection error: {str(e)}",
            )

        except APIStatusError as e:
            logger.error("LLM API returned status %s: %s", e.status_code, e.message)
            return LLMResponse(
                content=USER_FRIENDLY_UNAVAILABLE_MSG,
                model=target_model,
                is_success=False,
                is_configured=True,
                error_message=f"Status {e.status_code}: {e.message}",
            )

        except Exception as e:
            logger.exception("Unexpected error in LLM service.")
            return LLMResponse(
                content=USER_FRIENDLY_UNAVAILABLE_MSG,
                model=target_model,
                is_success=False,
                is_configured=True,
                error_message=str(e),
            )


# Backward-compatibility aliases
QwenLLMService = UnifiedLLMService
GeminiLLMService = UnifiedLLMService


def get_llm_service() -> BaseLLMProvider:
    """Return the active configured unified LLM provider."""
    return UnifiedLLMService()