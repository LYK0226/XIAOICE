"""
Child Development Video Analysis — 3-step SequentialAgent pipeline.

Architecture:
  Step 1: Transcription    – transcribes audio/speech from the video
  Step 2: Full Analysis    – evaluates motor + language development with RAG
  Step 3: Report Generation – synthesises results into a parent-friendly report

Uses Google Agent Development Kit (ADK) with SequentialAgent.
Vertex AI credentials injected directly into the Gemini model (no env-var mutation).
Service account credentials come from .env.
"""

import os
import json
import logging
import time
import traceback
import threading
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List

from google.adk.agents import Agent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app import gcp_bucket
from app.agent.prompts import (
    VIDEO_TRANSCRIPTION_INSTRUCTION,
    VIDEO_ANALYSIS_INSTRUCTION,
    VIDEO_REPORT_INSTRUCTION,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thread-local storage: propagate user_id / Flask app to RAG helpers
# ---------------------------------------------------------------------------
_tl = threading.local()

# No process-global env-var lock needed — credentials are injected directly
# into each Gemini instance's Client, avoiding race conditions.


def _get_tl_user_id() -> Optional[int]:
    """Return the user_id set by run_video_analysis for this thread, or None."""
    return getattr(_tl, "user_id", None)


def _get_tl_flask_app():
    """Return the Flask app instance stored by run_video_analysis, or None."""
    return getattr(_tl, "flask_app", None)


def _rag_search(query: str, top_k: int = 3):
    """Call search_knowledge inside an app context if available."""
    from app.rag.retriever import search_knowledge

    flask_app = _get_tl_flask_app()
    if flask_app is None:
        try:
            from flask import current_app as _ca
            flask_app = _ca._get_current_object()
        except RuntimeError:
            pass
    if flask_app is None:
        from app import get_app as _get_app
        flask_app = _get_app()
    if flask_app is not None:
        with flask_app.app_context():
            return search_knowledge(query, top_k=top_k)
    return search_knowledge(query, top_k=top_k)


def _bilingual_rag_search(queries_zh: list, queries_en: list, top_k: int = 5):
    """Search RAG with both Chinese and English queries, deduplicate."""
    all_results = []
    for q in queries_zh + queries_en:
        try:
            results = _rag_search(q, top_k=top_k)
            all_results.extend(results)
        except Exception:
            continue

    seen = set()
    unique = []
    for r in all_results:
        cid = r.get("chunk_id")
        if cid and cid not in seen:
            seen.add(cid)
            unique.append(r)
    unique.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return unique


def _get_age_bracket(age_months: float) -> str:
    """Map age in months to a bracket key."""
    if age_months < 6:
        return "0-6"
    elif age_months < 12:
        return "6-12"
    elif age_months < 18:
        return "12-18"
    elif age_months < 24:
        return "18-24"
    elif age_months < 36:
        return "24-36"
    elif age_months < 48:
        return "36-48"
    elif age_months < 60:
        return "48-60"
    else:
        return "60-72"


# ---------------------------------------------------------------------------
# RAG helper functions
# ---------------------------------------------------------------------------

def get_age_standards(age_months: float) -> str:
    """Retrieves age-appropriate developmental milestones from RAG."""
    bracket = _get_age_bracket(age_months)
    try:
        from app.rag.retriever import format_context
        unique = _bilingual_rag_search(
            queries_zh=[
                f"{bracket}個月 兒童發展里程碑 發展標準",
                f"{bracket}個月 粗大動作 精細動作 語言發展 社交發展",
                f"{bracket}個月 認知發展 適應性行為 自理能力",
                f"{bracket}個月 社交情緒 行為發展 兒童評估",
            ],
            queries_en=[
                f"developmental milestones children {bracket} months",
                f"gross motor fine motor language social development {bracket} months",
                f"cognitive adaptive self-care development {bracket} months",
            ],
            top_k=3,
        )
        if unique:
            rag_context = format_context(unique[:8], max_chars=6000)
            result = {
                "age_bracket": bracket + " months",
                "knowledge_base_references": rag_context,
                "source": "RAG",
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.warning("RAG retrieval failed in get_age_standards: %s", exc)
    return json.dumps({"age_bracket": bracket + " months", "source": "RAG unavailable"}, ensure_ascii=False)


def assess_motor_development(observations: str, age_months: float) -> str:
    """Evaluates motor development observations against age standards."""
    bracket = _get_age_bracket(age_months)
    _NO_RAG = (
        "The knowledge base returned NO relevant standards for this dimension. "
        "You MUST set 'standards_compliance' to an empty array [] and 'rag_available' to false."
    )
    _RAG = (
        "Use the knowledge_base_context below to identify age-appropriate gross and fine "
        "motor milestones. For EACH standard/milestone found, create an entry in 'standards_compliance' "
        "with status PASS / CONCERN / UNABLE_TO_ASSESS and a brief rationale."
    )
    result = {
        "age_bracket": bracket + " months",
        "observations_received": observations[:500],
        "instruction": _NO_RAG,
        "rag_standards_found": False,
    }
    try:
        from app.rag.retriever import format_context
        rag_results = _bilingual_rag_search(
            queries_zh=[f"{bracket}個月 兒童 粗大動作 精細動作 身體動作發展 評估標準"],
            queries_en=[f"motor development gross motor fine motor children {bracket} months"],
            top_k=5,
        )
        if rag_results:
            result["knowledge_base_context"] = format_context(rag_results, max_chars=2000)
            result["citations"] = [
                {"source": r["document_name"], "page": r.get("page_number"), "relevance": r["similarity"]}
                for r in rag_results
            ]
            result["rag_standards_found"] = True
            result["instruction"] = _RAG
    except Exception as exc:
        logger.warning("RAG retrieval failed in assess_motor_development: %s", exc)
    return json.dumps(result, ensure_ascii=False, indent=2)


def assess_language_development(observations: str, age_months: float) -> str:
    """Evaluates language/speech development observations against age standards."""
    bracket = _get_age_bracket(age_months)
    _NO_RAG = (
        "The knowledge base returned NO relevant standards for this dimension. "
        "You MUST set 'standards_compliance' to an empty array [] and 'rag_available' to false."
    )
    _RAG = (
        "Use the knowledge_base_context below to identify age-appropriate language milestones. "
        "For EACH standard/milestone found, create an entry in 'standards_compliance' "
        "with status PASS / CONCERN / UNABLE_TO_ASSESS and a brief rationale."
    )
    result = {
        "age_bracket": bracket + " months",
        "observations_received": observations[:500],
        "instruction": _NO_RAG,
        "rag_standards_found": False,
    }
    try:
        from app.rag.retriever import format_context
        rag_results = _bilingual_rag_search(
            queries_zh=[f"{bracket}個月 兒童 語言發展 語言理解 語言表達 溝通能力 評估標準"],
            queries_en=[f"language speech communication development children {bracket} months"],
            top_k=5,
        )
        if rag_results:
            result["knowledge_base_context"] = format_context(rag_results, max_chars=2000)
            result["citations"] = [
                {"source": r["document_name"], "page": r.get("page_number"), "relevance": r["similarity"]}
                for r in rag_results
            ]
            result["rag_standards_found"] = True
            result["instruction"] = _RAG
    except Exception as exc:
        logger.warning("RAG retrieval failed in assess_language_development: %s", exc)
    return json.dumps(result, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Collect RAG context for motor + language dimensions
# ---------------------------------------------------------------------------

def _collect_rag_context(age_months: float) -> str:
    """Pre-query RAG for motor and language dimensions."""
    sections = []

    # General age standards
    age_std = get_age_standards(age_months)
    sections.append(f"=== Age Standards ===\n{age_std}")

    # Per-dimension RAG
    placeholder = "Behaviors observed in the video"

    motor_ctx = assess_motor_development(placeholder, age_months)
    sections.append(f"=== Motor Development RAG Reference ===\n{motor_ctx}")

    lang_ctx = assess_language_development(placeholder, age_months)
    sections.append(f"=== Language Development RAG Reference ===\n{lang_ctx}")

    return "\n\n".join(sections)


def _safe_parse(text) -> Any:
    """Try to parse JSON from text, return as-is if not JSON."""
    if isinstance(text, dict):
        return text
    if isinstance(text, list):
        return text
    if not isinstance(text, str) or not text.strip():
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if len(lines) >= 2:
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return {"raw_text": text}

def _merge_dimension_standards(
    report_dimension: Dict[str, Any],
    analysis_dimension: Dict[str, Any],
) -> Dict[str, Any]:
    """Backfill standards from analysis output into the final report.

    The report-writing agent sometimes omits or overwrites `standards_table`
    and `rag_available` even when the analysis step already produced valid
    `standards_compliance` entries from RAG. This helper preserves those raw
    results so the UI/PDF can still display them.
    """
    merged = dict(report_dimension or {})
    analysis_standards = analysis_dimension.get("standards_compliance") or []
    report_standards = merged.get("standards_table") or []

    if not report_standards and analysis_standards:
        merged["standards_table"] = analysis_standards

    if "rag_available" not in merged:
        merged["rag_available"] = analysis_dimension.get("rag_available", False)
    elif merged.get("rag_available") is False and analysis_standards:
        merged["rag_available"] = True

    return merged

def _merge_report_with_analysis(
    final_report: Dict[str, Any],
    analysis_result: Dict[str, Any],
) -> Dict[str, Any]:
    """Ensure final report keeps standards from the raw analysis step."""
    report = dict(final_report or {})
    motor_analysis = analysis_result.get("motor_development", {})
    language_analysis = analysis_result.get("language_development", {})

    report["motor_development"] = _merge_dimension_standards(
        report.get("motor_development", {}),
        motor_analysis,
    )
    report["language_development"] = _merge_dimension_standards(
        report.get("language_development", {}),
        language_analysis,
    )

    return report


# ---------------------------------------------------------------------------
# Vertex AI client helpers (no env-var mutation)
# ---------------------------------------------------------------------------

def _create_vertex_client(vertex_config: Dict[str, Any]):
    """Create a google.genai.Client with explicit Vertex AI credentials.

    This avoids setting process-global env vars, preventing race conditions
    with concurrent ADK operations (e.g. chat_agent).
    """
    from google.genai import Client
    from google.oauth2 import service_account

    sa_json = vertex_config.get('service_account', '')
    sa_info = json.loads(sa_json) if isinstance(sa_json, str) else sa_json
    project_id = vertex_config.get('project_id', '')
    location = vertex_config.get('location') or 'global'

    credentials = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=['https://www.googleapis.com/auth/cloud-platform'],
    )

    return Client(
        vertexai=True,
        project=project_id,
        location=location,
        credentials=credentials,
    )


def _create_vertex_model(model_name: str, client) -> 'Gemini':
    """Create an ADK Gemini LLM with a pre-configured Client.

    Injects *client* into the Gemini instance's cached_property slot so that
    ADK never attempts to create its own Client from env vars.
    """
    from google.adk.models.google_llm import Gemini

    gemini = Gemini(model=model_name)
    # Override the cached_property before it is ever accessed
    gemini.__dict__['api_client'] = client
    return gemini


# ---------------------------------------------------------------------------
# ADK generation config
# ---------------------------------------------------------------------------

_GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.0,
    top_p=0.9,
    max_output_tokens=65536,
    safety_settings=[
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
    ],
)


# ---------------------------------------------------------------------------
# SequentialAgent pipeline factory
# ---------------------------------------------------------------------------

def _create_video_pipeline(
    model_name: str,
    vertex_config: Dict[str, Any],
) -> SequentialAgent:
    """Create a 3-step SequentialAgent for video analysis.

    Each agent receives its own Gemini instance whose Client is pre-configured
    with explicit Vertex AI credentials (no env-var dependency).

    Agent 1 (Transcription):  output_key -> "transcription"
    Agent 2 (Analysis):       reads {transcription}, {child_info}, {rag_context}
                              output_key -> "analysis_result"
    Agent 3 (Report):         reads {transcription}, {analysis_result}, {child_info}
                              output_key -> "final_report"
    """
    client = _create_vertex_client(vertex_config)

    transcription_agent = Agent(
        name="video_transcription",
        model=_create_vertex_model(model_name, client),
        instruction=VIDEO_TRANSCRIPTION_INSTRUCTION,
        output_key="transcription",
        generate_content_config=_GENERATION_CONFIG,
    )

    analysis_agent = Agent(
        name="video_analysis",
        model=_create_vertex_model(model_name, client),
        instruction=VIDEO_ANALYSIS_INSTRUCTION,
        output_key="analysis_result",
        generate_content_config=_GENERATION_CONFIG,
    )

    report_agent = Agent(
        name="video_report",
        model=_create_vertex_model(model_name, client),
        instruction=VIDEO_REPORT_INSTRUCTION,
        output_key="final_report",
        generate_content_config=_GENERATION_CONFIG,
    )

    pipeline = SequentialAgent(
        name="video_analysis_pipeline",
        sub_agents=[transcription_agent, analysis_agent, report_agent],
    )

    return pipeline


# ---------------------------------------------------------------------------
# Async pipeline runner
# ---------------------------------------------------------------------------

async def _run_pipeline_async(
    pipeline: SequentialAgent,
    user_id: str,
    session_id: str,
    user_content: types.Content,
    initial_state: Dict[str, Any],
) -> Dict[str, str]:
    """Run the SequentialAgent pipeline and return state values.

    Returns dict with keys: transcription, analysis_result, final_report
    (raw text strings from each agent's output_key).
    """
    session_service = InMemorySessionService()
    runner = Runner(
        agent=pipeline,
        app_name="video_analysis",
        session_service=session_service,
    )

    # Create session with pre-populated state (child_info, rag_context)
    await session_service.create_session(
        app_name="video_analysis",
        user_id=user_id,
        session_id=session_id,
        state=initial_state,
    )

    # Run the pipeline — consume all events
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=user_content,
    ):
        if hasattr(event, 'author') and event.author:
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts') and event.content.parts:
                    first_text = ""
                    for p in event.content.parts:
                        if hasattr(p, 'text') and p.text:
                            first_text = p.text[:100]
                            break
                    if first_text:
                        logger.info("[Pipeline] Agent '%s' produced output: %s...",
                                    event.author, first_text[:80])

    # Retrieve session to read output_key state values
    session = await session_service.get_session(
        app_name="video_analysis",
        user_id=user_id,
        session_id=session_id,
    )

    state = session.state if session else {}
    return {
        "transcription": state.get("transcription", ""),
        "analysis_result": state.get("analysis_result", ""),
        "final_report": state.get("final_report", ""),
    }


# ---------------------------------------------------------------------------
# Main entry point: 3-step pipeline
# ---------------------------------------------------------------------------

def run_video_analysis(
    video_gcs_url: str,
    video_mime_type: str,
    child_name: str,
    child_age_months: float,
    model_name: str = "gemini-2.0-flash",
    user_id: str = "default",
    vertex_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run 3-step video analysis using SequentialAgent on Vertex AI.

    Steps:
      1. Transcription — video + transcription prompt
      2. Full analysis — video + transcription + RAG context
      3. Report generation — text-only synthesis

    Returns dict compatible with video_access_routes.py handler.
    """
    if not vertex_config:
        return {"success": False, "error": "Vertex AI config (from .env) not provided"}

    # Propagate user_id & Flask app to RAG helpers via thread-local
    try:
        _tl.user_id = int(user_id)
    except (ValueError, TypeError):
        _tl.user_id = None
    try:
        from flask import current_app as _ca
        _tl.flask_app = _ca._get_current_object()
    except RuntimeError:
        _tl.flask_app = None

    # --- Retry wrapper ---
    max_retries = 5
    backoff_base = 10
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Pipeline starting (attempt %d/%d): model=%s, project=%s",
                        attempt, max_retries, model_name, vertex_config.get('project_id')),

            # --- Download video bytes ---
            file_data = gcp_bucket.download_file_from_gcs(video_gcs_url)
            age_bracket = _get_age_bracket(child_age_months)

            child_info = (
                f"兒童資料：\n"
                f"- 姓名：{child_name}\n"
                f"- 年齡：{child_age_months:.1f} 個月\n"
                f"- 年齡段：{age_bracket} 個月"
            )

            # --- Pre-compute RAG context ---
            logger.info("[Step 0] Collecting RAG context...")
            rag_context = _collect_rag_context(child_age_months)

            # --- Create pipeline (with injected Vertex credentials) ---
            pipeline = _create_video_pipeline(model_name, vertex_config)

            # --- Build user message with video ---
            video_part = types.Part.from_bytes(data=file_data, mime_type=video_mime_type)
            text_part = types.Part.from_text(
                text=f"Please analyze the child's development in this video.\n\n{child_info}"
            )
            user_content = types.Content(
                role="user",
                parts=[text_part, video_part],
            )

            # --- Pre-populate session state ---
            initial_state = {
                "child_info": child_info,
                "rag_context": rag_context,
            }

            session_id = f"video_{user_id}_{int(time.time())}_{attempt}"

            # --- Run pipeline in a new event loop ---
            logger.info("[Step 1-3] Running SequentialAgent pipeline...")
            loop = asyncio.new_event_loop()
            try:
                results = loop.run_until_complete(
                    _run_pipeline_async(
                        pipeline=pipeline,
                        user_id=user_id,
                        session_id=session_id,
                        user_content=user_content,
                        initial_state=initial_state,
                    )
                )
            finally:
                loop.close()

            # --- Parse results ---
            transcription_result = _safe_parse(results["transcription"])
            analysis_result = _safe_parse(results["analysis_result"])
            final_report = _safe_parse(results["final_report"])
            if isinstance(analysis_result, dict) and isinstance(final_report, dict):
                final_report = _merge_report_with_analysis(final_report, analysis_result)

            logger.info("[Step 1/3] Transcription done.")
            logger.info("[Step 2/3] Analysis done.")
            logger.info("[Step 3/3] Report done.")

            # Extract per-dimension results
            motor_analysis_result = analysis_result.get("motor_development", {})
            language_analysis_result = analysis_result.get("language_development", {})
            # Other dimensions not analysed — return empty dicts for compatibility
            behavioral_cognitive_result = {
                "social_emotional": {},
                "cognitive": {},
                "adaptive_behavior": {},
                "selfcare": {},
            }

            return {
                "success": True,
                "transcription_result": transcription_result,
                "motor_analysis_result": motor_analysis_result,
                "language_analysis_result": language_analysis_result,
                "behavioral_cognitive_result": behavioral_cognitive_result,
                "final_report": final_report,
            }

        except Exception as e:
            last_error = e
            err_str = str(e)
            is_retryable = any(
                code in err_str
                for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "Socket closed")
            )
            if attempt < max_retries and is_retryable:
                wait_time = backoff_base * attempt
                logger.warning(
                    "Pipeline attempt %d/%d failed: %s — retrying in %ds...",
                    attempt, max_retries, e, wait_time,
                )
                time.sleep(wait_time)
                continue

            logger.error("Video analysis failed: %s", e)
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    return {"success": False, "error": f"All {max_retries} attempts failed: {last_error}"}
