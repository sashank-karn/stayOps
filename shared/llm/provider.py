"""
Configurable LLM client factory.

The agents never import OpenAI or Gemini directly — they call `get_llm()`, which reads
`LLM_PROVIDER` from the environment and returns a LangChain chat model. Switching
providers is a `.env` change, not a code change.

The provider SDK imports are **lazy** so this module can be imported in Phase 1 before
the LangChain packages are installed (those arrive with the agent framework in Phase 4).
"""
from __future__ import annotations

from typing import Any

from shared.config import get_settings

available_providers = ("openai", "gemini")


def get_llm(**overrides: Any):
    """
    Return a chat model for the configured provider.

    Args:
        **overrides: optional per-call overrides, e.g. ``get_llm(temperature=0)`` or
            ``get_llm(model="gpt-4o")``.

    Raises:
        ValueError: if the provider is unknown or its API key is missing.
        ImportError: if the provider's LangChain package is not yet installed.
    """
    settings = get_settings()
    provider = overrides.pop("provider", settings.llm_provider)
    model = overrides.pop("model", settings.llm_model)
    temperature = overrides.pop("temperature", settings.llm_temperature)

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set.")
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:  # pragma: no cover - depends on install phase
            raise ImportError(
                "langchain-openai is not installed. Install agent deps (Phase 4)."
            ) from exc
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.openai_api_key,
            **overrides,
        )

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("LLM_PROVIDER=gemini but GEMINI_API_KEY is not set.")
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
        except ImportError as exc:  # pragma: no cover - depends on install phase
            raise ImportError(
                "langchain-google-genai is not installed. Install agent deps (Phase 4)."
            ) from exc
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            google_api_key=settings.gemini_api_key,
            **overrides,
        )

    raise ValueError(
        f"Unknown LLM_PROVIDER={provider!r}. Supported: {', '.join(available_providers)}."
    )
