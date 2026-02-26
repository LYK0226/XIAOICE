"""
Embedding service for RAG.

Uses Google's embedding models via Vertex AI (service account) to generate
768-dimensional embeddings.  No per-user API key is needed — all calls go
through the project's Service Account configured via GCS_CREDENTIALS_PATH.
"""

import logging
import os
import time
from typing import List, Optional

from google import genai

logger = logging.getLogger(__name__)


# Cache the last working model + API version to avoid repeated probing.
_LAST_WORKING_API_VERSION: Optional[str] = None
_LAST_WORKING_MODEL: Optional[str] = None


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _get_embedding_model() -> str:
    """Return the configured embedding model name."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_EMBEDDING_MODEL", "gemini-embedding-001")
    except RuntimeError:
        return os.environ.get("RAG_EMBEDDING_MODEL", "gemini-embedding-001")


def _candidate_embedding_models() -> List[str]:
    """Return embedding model candidates ordered by preference."""
    preferred = _get_embedding_model()
    candidates = [preferred]

    for fallback in ("gemini-embedding-001", "text-embedding-004", "text-multilingual-embedding-002"):
        if fallback not in candidates:
            candidates.append(fallback)

    return candidates


def _get_embedding_dimension() -> int:
    """Return the expected embedding dimension."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_EMBEDDING_DIMENSION", 768)
    except RuntimeError:
        return int(os.environ.get("RAG_EMBEDDING_DIMENSION", "768"))


def _is_model_not_found_error(exc: Optional[Exception]) -> bool:
    if exc is None:
        return False
    msg = str(exc).lower()
    return ("not_found" in msg or "not found" in msg) and (
        "embedcontent" in msg or "embedding" in msg or "model" in msg
    )


# ---------------------------------------------------------------------------
# Vertex AI client (Service Account only)
# ---------------------------------------------------------------------------

def _get_genai_client(api_version: Optional[str] = None) -> genai.Client:
    """
    Build a google-genai Client using the project Service Account via
    Vertex AI.  Reads credentials from GCS_CREDENTIALS_PATH env var.
    """
    credentials_path = (
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or os.environ.get("GCS_CREDENTIALS_PATH")
    )
    if credentials_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")

    if not project:
        try:
            from flask import current_app
            project = current_app.config.get("GOOGLE_CLOUD_PROJECT")
            location = current_app.config.get("GOOGLE_CLOUD_LOCATION", "global")
        except RuntimeError:
            pass

    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT is not set. "
            "Configure it in .env for Vertex AI embedding."
        )

    client_kwargs: dict = {}
    if api_version:
        client_kwargs["http_options"] = {"api_version": api_version}

    return genai.Client(
        vertexai=True,
        project=project,
        location=location,
        **client_kwargs,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_embeddings(
    texts: List[str],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
    batch_size: int = 100,
    max_retries: int = 3,
) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings via Vertex AI.

    Args:
        texts:      Strings to embed.
        task_type:  "RETRIEVAL_DOCUMENT" for indexing,
                    "RETRIEVAL_QUERY" for search queries.
        batch_size: Max texts per API call.
        max_retries: Retries on transient errors (with exponential backoff).

    Returns:
        List of embedding vectors (each a list of floats).
    """
    global _LAST_WORKING_API_VERSION, _LAST_WORKING_MODEL

    if not texts:
        return []

    model_candidates = _candidate_embedding_models()
    if _LAST_WORKING_MODEL:
        model_candidates = [_LAST_WORKING_MODEL] + [m for m in model_candidates if m != _LAST_WORKING_MODEL]

    dimension = _get_embedding_dimension()

    # Determine API version order
    api_version_candidates = ["v1", "v1beta"]
    if _LAST_WORKING_API_VERSION:
        api_version_candidates = [_LAST_WORKING_API_VERSION] + [
            v for v in api_version_candidates if v != _LAST_WORKING_API_VERSION
        ]

    # Try to initialize client
    client = None
    client_api_version = None
    for api_version in api_version_candidates:
        try:
            client = _get_genai_client(api_version=api_version)
            client_api_version = api_version
            break
        except Exception as exc:
            logger.warning("Failed to init embedding client with api_version=%s: %s", api_version, exc)

    if client is None:
        raise RuntimeError("Failed to initialize Vertex AI embedding client.")

    all_embeddings: List[List[float]] = []
    active_model = model_candidates[0]

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        success = False
        last_exc: Optional[Exception] = None

        for model_name in [active_model] + [m for m in model_candidates if m != active_model]:
            for attempt in range(1, max_retries + 1):
                try:
                    response = client.models.embed_content(
                        model=model_name,
                        contents=batch,
                        config={
                            "task_type": task_type,
                            "output_dimensionality": dimension,
                        },
                    )
                    for emb in response.embeddings:
                        all_embeddings.append(emb.values)
                    active_model = model_name
                    _LAST_WORKING_API_VERSION = client_api_version
                    _LAST_WORKING_MODEL = model_name
                    success = True
                    break
                except Exception as exc:
                    last_exc = exc
                    if _is_model_not_found_error(exc):
                        logger.debug(
                            "Embedding model %s unavailable on api_version=%s: %s",
                            model_name, client_api_version, exc,
                        )
                        break

                    wait = 2 ** attempt
                    logger.warning(
                        "Embedding attempt %d/%d failed for model %s (%s). Retrying in %ds…",
                        attempt, max_retries, model_name, exc, wait,
                    )
                    if attempt == max_retries:
                        break
                    time.sleep(wait)

            if success:
                break

        if not success:
            # Try alternate API version before giving up
            if _is_model_not_found_error(last_exc) and client_api_version:
                alternate = "v1beta" if client_api_version == "v1" else "v1"
                try:
                    client = _get_genai_client(api_version=alternate)
                    client_api_version = alternate
                    for model_name in model_candidates:
                        try:
                            response = client.models.embed_content(
                                model=model_name,
                                contents=batch,
                                config={
                                    "task_type": task_type,
                                    "output_dimensionality": dimension,
                                },
                            )
                            for emb in response.embeddings:
                                all_embeddings.append(emb.values)
                            active_model = model_name
                            _LAST_WORKING_API_VERSION = client_api_version
                            _LAST_WORKING_MODEL = model_name
                            success = True
                            break
                        except Exception as retry_exc:
                            last_exc = retry_exc
                            if _is_model_not_found_error(retry_exc):
                                continue
                            raise
                    if success:
                        continue
                except Exception:
                    pass

            raise RuntimeError(
                f"Embedding generation failed after trying models {model_candidates}: {last_exc}"
            ) from last_exc

    return all_embeddings


def generate_query_embedding(query: str) -> List[float]:
    """Embed a single search query (uses RETRIEVAL_QUERY task type)."""
    result = generate_embeddings([query], task_type="RETRIEVAL_QUERY")
    return result[0]
