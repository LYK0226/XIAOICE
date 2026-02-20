"""
Embedding service for RAG.

Uses Google's text-multilingual-embedding-002 model via the google-genai SDK
to generate 768-dimensional embeddings.  Supports both AI Studio (API key)
and Vertex AI (service account) authentication paths.
"""

import logging
import os
import time
from typing import List, Optional

from google import genai

logger = logging.getLogger(__name__)


_LAST_WORKING_API_VERSION = {}
_LAST_WORKING_MODEL = {}
_UNSUPPORTED_API_VERSIONS = {
    "api_key": set(),
    "vertex": set(),
}

# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _get_embedding_model() -> str:
    """Return the configured embedding model name."""
    from flask import current_app
    try:
        return current_app.config.get("RAG_EMBEDDING_MODEL", "text-multilingual-embedding-002")
    except RuntimeError:
        return os.environ.get("RAG_EMBEDDING_MODEL", "text-multilingual-embedding-002")


def _candidate_embedding_models(*, prefer_ai_studio: bool = False) -> List[str]:
    """Return embedding model candidates ordered by preference."""
    preferred = _get_embedding_model()
    candidates = [preferred]

    # AI Studio keys often expose text-embedding-004 earlier than multilingual models.
    if prefer_ai_studio and preferred == "text-multilingual-embedding-002":
        candidates = ["text-embedding-004", preferred]

    # Additional robust fallbacks.
    if "gemini-embedding-001" not in candidates:
        candidates.append("gemini-embedding-001")
    if "text-embedding-004" not in candidates:
        candidates.append("text-embedding-004")
    if "text-multilingual-embedding-002" not in candidates:
        candidates.append("text-multilingual-embedding-002")

    # Deduplicate while preserving order
    deduped = []
    for model in candidates:
        if model not in deduped:
            deduped.append(model)
    return deduped


def _get_embedding_dimension() -> int:
    """Return the expected embedding dimension."""
    from flask import current_app
    try:
        return current_app.config.get("RAG_EMBEDDING_DIMENSION", 768)
    except RuntimeError:
        return int(os.environ.get("RAG_EMBEDDING_DIMENSION", "768"))


def _is_model_not_found_error(exc: Optional[Exception]) -> bool:
    if exc is None:
        return False
    msg = str(exc).lower()
    return (
        "not_found" in msg
        or "not found" in msg
    ) and ("embedcontent" in msg or "embedding" in msg)


def _get_genai_client(
    api_key_override: Optional[str] = None,
    *,
    api_version: Optional[str] = None,
) -> genai.Client:
    """
    Build a google-genai Client using whichever credentials are available.
    Priority: GOOGLE_API_KEY env var  →  application-default / service account.
    """
    client_kwargs = {}
    if api_version:
        client_kwargs["http_options"] = {"api_version": api_version}

    api_key = api_key_override or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key, **client_kwargs)

    # Fall back to Vertex AI / application-default credentials
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    if project:
        return genai.Client(vertexai=True, project=project, location=location, **client_kwargs)

    raise RuntimeError(
        "RAG embedding credentials are not configured. "
        "Set GOOGLE_API_KEY, or set GOOGLE_CLOUD_PROJECT (or GCP_PROJECT) "
        "with application default credentials and optional GOOGLE_CLOUD_LOCATION."
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
    api_key: Optional[str] = None,
) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts:      Strings to embed.
        task_type:  "RETRIEVAL_DOCUMENT" for indexing,
                    "RETRIEVAL_QUERY" for search queries.
        batch_size: Max texts per API call (API limit is 250, default 100).
        max_retries: Retries on transient errors (with exponential backoff).
        api_key: Optional explicit API key (overrides env GOOGLE_API_KEY).

    Returns:
        List of embedding vectors (each a list of floats with length =
        RAG_EMBEDDING_DIMENSION).
    """
    if not texts:
        return []

    using_api_key_mode = bool(api_key or os.environ.get("GOOGLE_API_KEY"))
    mode_key = "api_key" if using_api_key_mode else "vertex"
    model_candidates = _candidate_embedding_models(prefer_ai_studio=using_api_key_mode)
    cached_model = _LAST_WORKING_MODEL.get(mode_key)
    if cached_model:
        model_candidates = [cached_model] + [m for m in model_candidates if m != cached_model]

    dimension = _get_embedding_dimension()
    client = None
    client_api_version = None
    client_init_errors = []
    api_version_candidates = ["v1", "v1beta"]
    unsupported_versions = _UNSUPPORTED_API_VERSIONS.get(mode_key, set())
    api_version_candidates = [v for v in api_version_candidates if v not in unsupported_versions]
    if not api_version_candidates:
        # If both versions were marked unsupported previously, retry from scratch.
        _UNSUPPORTED_API_VERSIONS[mode_key] = set()
        api_version_candidates = ["v1", "v1beta"]
    cached_api_version = _LAST_WORKING_API_VERSION.get(mode_key)
    if cached_api_version in {"v1", "v1beta"}:
        api_version_candidates = [cached_api_version] + [v for v in api_version_candidates if v != cached_api_version]

    for api_version in api_version_candidates:
        try:
            client = _get_genai_client(api_key_override=api_key, api_version=api_version)
            client_api_version = api_version
            break
        except Exception as exc:
            client_init_errors.append(f"{api_version}: {exc}")

    if client is None:
        raise RuntimeError(
            "Failed to initialize embedding client: " + " | ".join(client_init_errors)
        )
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
                    _LAST_WORKING_API_VERSION[mode_key] = client_api_version
                    _LAST_WORKING_MODEL[mode_key] = model_name
                    success = True
                    break
                except Exception as exc:
                    last_exc = exc
                    if _is_model_not_found_error(exc):
                        logger.debug(
                            "Embedding model %s unavailable on api_version=%s (%s); trying next candidate.",
                            model_name,
                            client_api_version,
                            exc,
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
            # If all models are unavailable and we are currently on one API version,
            # retry once with the alternate API version before failing.
            if _is_model_not_found_error(last_exc) and client_api_version in {"v1", "v1beta"}:
                _UNSUPPORTED_API_VERSIONS.setdefault(mode_key, set()).add(client_api_version)
                alternate_api_version = "v1beta" if client_api_version == "v1" else "v1"
                try:
                    client = _get_genai_client(api_key_override=api_key, api_version=alternate_api_version)
                    client_api_version = alternate_api_version
                    logger.info(
                        "All embedding models unavailable on first API version; retrying with api_version=%s",
                        client_api_version,
                    )
                    # Retry this batch once on alternate API version.
                    retried = False
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
                            _LAST_WORKING_API_VERSION[mode_key] = client_api_version
                            _LAST_WORKING_MODEL[mode_key] = model_name
                            retried = True
                            break
                        except Exception as retry_exc:
                            last_exc = retry_exc
                            if _is_model_not_found_error(retry_exc):
                                logger.debug(
                                    "Embedding model %s unavailable on api_version=%s (%s); trying next candidate.",
                                    model_name,
                                    client_api_version,
                                    retry_exc,
                                )
                                continue
                            raise

                    if retried:
                        continue
                except Exception as switch_exc:
                    last_exc = switch_exc

            raise RuntimeError(
                f"Embedding generation failed after trying models {model_candidates} across API versions v1/v1beta: {last_exc}"
            ) from last_exc

    return all_embeddings


def generate_query_embedding(query: str, *, api_key: Optional[str] = None) -> List[float]:
    """Embed a single search query (uses RETRIEVAL_QUERY task type)."""
    result = generate_embeddings([query], task_type="RETRIEVAL_QUERY", api_key=api_key)
    return result[0]
