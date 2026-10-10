"""
Embedding generation module — Member 2 (Sonali / Sona1147).

Generates embeddings using configurable providers (OpenAI or Gemini).
Uses the shared config from shared/config.py for provider selection.
"""
from __future__ import annotations

import logging
from typing import Any

from shared.config import get_settings

logger = logging.getLogger(__name__)


def get_embedding_function():
    """
    Return a LangChain-compatible embedding function based on the configured provider.

    Reads EMBEDDING_PROVIDER and EMBEDDING_MODEL from the environment / Settings.

    Returns:
        A LangChain Embeddings instance.

    Raises:
        ValueError: if the provider is unknown or the API key is missing.
        ImportError: if the provider's package is not installed.
    """
    settings = get_settings()
    provider = settings.embedding_provider
    model = settings.embedding_model

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set.")
        try:
            from langchain_openai import OpenAIEmbeddings
        except ImportError as exc:
            raise ImportError(
                "langchain-openai is not installed. Run: pip install langchain-openai"
            ) from exc

        logger.info(f"Using OpenAI embeddings: model={model}")
        return OpenAIEmbeddings(
            model=model,
            openai_api_key=settings.openai_api_key,
        )

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("EMBEDDING_PROVIDER=gemini but GEMINI_API_KEY is not set.")
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
        except ImportError as exc:
            raise ImportError(
                "langchain-google-genai is not installed. Run: pip install langchain-google-genai"
            ) from exc

        logger.info(f"Using Google Gemini embeddings: model={model}")
        return GoogleGenerativeAIEmbeddings(
            model=model,
            google_api_key=settings.gemini_api_key,
        )

    raise ValueError(
        f"Unknown EMBEDDING_PROVIDER={provider!r}. Supported: openai, gemini."
    )


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (list of floats).
    """
    if not texts:
        return []

    embedding_fn = get_embedding_function()
    logger.info(f"Generating embeddings for {len(texts)} texts")
    embeddings = embedding_fn.embed_documents(texts)
    logger.info(f"Generated {len(embeddings)} embeddings (dim={len(embeddings[0]) if embeddings else 0})")
    return embeddings
