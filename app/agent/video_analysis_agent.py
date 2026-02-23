"""
ADK Multi-Agent System for Child Development Video Analysis.

Architecture (SequentialAgent workflow):
  VideoAnalysisCoordinator (SequentialAgent)
    ├─ 1. TranscriptionAgent   – transcribes audio/speech from the video
    ├─ 2. MotorAnalysisAgent   – evaluates gross/fine motor development
    ├─ 3. LanguageAnalysisAgent – evaluates speech & language development
    └─ 4. ReportGeneratorAgent – synthesises results + improvement suggestions

Each specialist agent has FunctionTools it can call:
  • transcribe_video_tool       – wraps Gemini multimodal transcription
  • analyze_motor_tool          – wraps pose/movement analysis helpers
  • analyze_language_tool       – wraps speech-to-text / language checks
  • get_age_standards_tool      – RAG stub: returns developmental milestones for age
  • generate_report_pdf_tool    – builds a PDF and uploads it to GCS

Supports both AI Studio (ADK) and Vertex AI service account providers.
"""

import os
import json
import logging
import asyncio
import traceback
import threading
import queue
from datetime import datetime
from typing import Optional, Dict, Any, List, Generator

from google.adk.agents import Agent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app import gcp_bucket
from app.agent.prompts import (
    TRANSCRIPTION_AGENT_INSTRUCTION,
    MOTOR_ANALYSIS_AGENT_INSTRUCTION,
    LANGUAGE_ANALYSIS_AGENT_INSTRUCTION,
    REPORT_GENERATOR_AGENT_INSTRUCTION
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Developmental milestone data (previously in knowledge_base.py)
# ---------------------------------------------------------------------------
# Thread-local storage: allows run_video_analysis() to propagate the current
# user's numeric ID to the RAG helper functions (which are ADK FunctionTools
# and cannot accept extra arguments directly).
# ---------------------------------------------------------------------------
_tl = threading.local()


def _get_tl_user_id() -> Optional[int]:
    """Return the user_id set by run_video_analysis for this thread, or None."""
    return getattr(_tl, 'user_id', None)


def _get_tl_flask_app():
    """Return the Flask app instance stored by run_video_analysis, or None."""
    return getattr(_tl, 'flask_app', None)


def _rag_search(query: str, top_k: int = 3):
    """
    Helper: call search_knowledge inside an app context if available.
    Returns list of result dicts, or empty list on failure.
    """
    from app.rag.retriever import search_knowledge  # noqa: F401
    uid = _get_tl_user_id()
    # Resolve Flask app: prefer thread-local, then current_app, then get_app()
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
            return search_knowledge(query, top_k=top_k, user_id=uid)
    return search_knowledge(query, top_k=top_k, user_id=uid)


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
# FunctionTool-compatible functions (plain functions, ADK auto-wraps them)
# ---------------------------------------------------------------------------

def get_age_standards(age_months: float) -> str:
    """
    Retrieves age-appropriate developmental milestones for a child.
    This is the RAG knowledge retrieval tool.

    Searches the RAG knowledge base for developmental standards relevant to the child's age.

    Args:
        age_months: The child's age in months.

    Returns:
        JSON string of developmental standards retrieved from the knowledge base.
    """
    bracket = _get_age_bracket(age_months)

    try:
        from app.rag.retriever import format_context
        queries = [
            f"developmental milestones for children aged {bracket} months",
            f"gross motor fine motor language social development {bracket} months",
        ]
        all_results = []
        for q in queries:
            results = _rag_search(q, top_k=3)
            all_results.extend(results)

        if all_results:
            # Deduplicate by chunk_id
            seen = set()
            unique = []
            for r in all_results:
                if r['chunk_id'] not in seen:
                    seen.add(r['chunk_id'])
                    unique.append(r)
            unique.sort(key=lambda x: x['similarity'], reverse=True)

            rag_context = format_context(unique[:5], max_chars=4000)
            result = {
                "age_bracket": bracket + " months",
                "knowledge_base_references": rag_context,
                "source": "RAG",
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.warning("RAG retrieval failed in get_age_standards: %s", exc)

    # RAG unavailable — return empty shell so the agent can still proceed
    return json.dumps({"age_bracket": bracket + " months", "source": "RAG unavailable"}, ensure_ascii=False)


def assess_motor_development(observations: str, age_months: float) -> str:
    """
    Evaluates motor development observations against age standards.
    The agent should call this after analysing the video for movement.

    Args:
        observations: Text description of motor behaviours observed in the video.
        age_months: The child's age in months.

    Returns:
        JSON string with assessment structure: areas assessed, status per area, concerns.
    """
    bracket = _get_age_bracket(age_months)

    result = {
        "age_bracket": bracket + " months",
        "observations_received": observations[:500],
        "instruction": (
            "Use the knowledge_base_context below to identify age-appropriate gross and fine "
            "motor milestones for this child. For each milestone, indicate PASS / CONCERN / "
            "UNABLE_TO_ASSESS and provide a brief rationale."
        ),
    }

    # Retrieve RAG context
    try:
        from app.rag.retriever import format_context
        rag_results = _rag_search(
            f"motor development assessment criteria children {bracket} months gross motor fine motor",
            top_k=3,
        )
        if rag_results:
            result["knowledge_base_context"] = format_context(rag_results, max_chars=2000)
            result["citations"] = [
                {"source": r["document_name"], "page": r.get("page_number"), "relevance": r["similarity"]}
                for r in rag_results
            ]
    except Exception as exc:
        logger.warning("RAG retrieval failed in assess_motor_development: %s", exc)

    return json.dumps(result, ensure_ascii=False, indent=2)


def assess_language_development(observations: str, age_months: float) -> str:
    """
    Evaluates language/speech development observations against age standards.

    Args:
        observations: Text description of language behaviours observed in the video.
        age_months: The child's age in months.

    Returns:
        JSON string with assessment structure.
    """
    bracket = _get_age_bracket(age_months)

    result = {
        "age_bracket": bracket + " months",
        "observations_received": observations[:500],
        "instruction": (
            "Use the knowledge_base_context below to identify age-appropriate language and social "
            "milestones for this child. For each milestone, indicate PASS / CONCERN / "
            "UNABLE_TO_ASSESS and provide a brief rationale."
        ),
    }

    # Retrieve RAG context
    try:
        from app.rag.retriever import format_context
        rag_results = _rag_search(
            f"language speech communication development assessment criteria children {bracket} months",
            top_k=3,
        )
        if rag_results:
            result["knowledge_base_context"] = format_context(rag_results, max_chars=2000)
            result["citations"] = [
                {"source": r["document_name"], "page": r.get("page_number"), "relevance": r["similarity"]}
                for r in rag_results
            ]
    except Exception as exc:
        logger.warning("RAG retrieval failed in assess_language_development: %s", exc)

    return json.dumps(result, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------------------
# Agent & Runner Factory
# ---------------------------------------------------------------------------

class VideoAnalysisAgentManager:
    """Manages ADK agents for video analysis workflow."""

    APP_NAME = "video_analysis"

    def __init__(self):
        self._runners: Dict[str, Runner] = {}
        self._session_service = InMemorySessionService()
        self._created_sessions: set = set()

    def _build_agents(self, model_name: str = "gemini-2.0-flash") -> SequentialAgent:
        """Build the sequential workflow agent tree."""

        generation_config = types.GenerateContentConfig(
            temperature=0.3,    # low temp for analytical precision
            top_p=0.90,
            max_output_tokens=8192,
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

        transcription_agent = Agent(
            name="transcription_agent",
            model=model_name,
            description="Transcribes speech and vocalisations from child development videos",
            instruction=TRANSCRIPTION_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
            output_key="transcription_result",
        )

        motor_analysis_agent = Agent(
            name="motor_analysis_agent",
            model=model_name,
            description="Analyses motor development from child videos",
            instruction=MOTOR_ANALYSIS_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
            tools=[get_age_standards, assess_motor_development],
            output_key="motor_analysis_result",
        )

        language_analysis_agent = Agent(
            name="language_analysis_agent",
            model=model_name,
            description="Analyses language/speech development from child videos and transcription",
            instruction=LANGUAGE_ANALYSIS_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
            tools=[get_age_standards, assess_language_development],
            output_key="language_analysis_result",
        )

        report_generator_agent = Agent(
            name="report_generator_agent",
            model=model_name,
            description="Generates comprehensive child development report with recommendations",
            instruction=REPORT_GENERATOR_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
            output_key="final_report",
        )

        # SequentialAgent runs agents one after another
        coordinator = SequentialAgent(
            name="video_analysis_coordinator",
            description="Coordinates the full video analysis workflow: transcribe → motor → language → report",
            sub_agents=[
                transcription_agent,
                motor_analysis_agent,
                language_analysis_agent,
                report_generator_agent,
            ],
        )

        return coordinator

    def get_or_create_runner(self, api_key: str, model_name: str = "gemini-2.0-flash") -> Runner:
        """Get/create a Runner for the analysis workflow."""
        runner_key = f"va_{model_name}"
        if runner_key not in self._runners:
            os.environ['GOOGLE_API_KEY'] = api_key
            agent = self._build_agents(model_name)
            self._runners[runner_key] = Runner(
                agent=agent,
                app_name=self.APP_NAME,
                session_service=self._session_service,
            )
        else:
            # Always refresh API key
            os.environ['GOOGLE_API_KEY'] = api_key
        return self._runners[runner_key]

    def ensure_session(self, user_id: str, session_id: str):
        key = f"{self.APP_NAME}_{user_id}_{session_id}"
        if key not in self._created_sessions:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    self._session_service.create_session(
                        app_name=self.APP_NAME,
                        user_id=user_id,
                        session_id=session_id,
                        state={},
                    )
                )
                self._created_sessions.add(key)
            finally:
                loop.close()


# Singleton
_va_manager = VideoAnalysisAgentManager()


def get_video_analysis_manager() -> VideoAnalysisAgentManager:
    return _va_manager


# ---------------------------------------------------------------------------
# High-level API: run the full analysis (sync, for background threads)
# ---------------------------------------------------------------------------

def run_video_analysis(
    video_gcs_url: str,
    video_mime_type: str,
    child_name: str,
    child_age_months: float,
    api_key: str,
    model_name: str = "gemini-2.0-flash",
    user_id: str = "default",
    provider: str = "ai_studio",
    vertex_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run the full video analysis pipeline and return structured results.

    Returns:
        Dict with keys: transcription_result, motor_analysis_result,
        language_analysis_result, final_report, success, error
    """
    # Set thread-local user_id and Flask app so RAG FunctionTools can use
    # the user's API key and push an app context when called from ADK threads.
    try:
        _tl.user_id = int(user_id)
    except (ValueError, TypeError):
        _tl.user_id = None
    try:
        from flask import current_app as _ca
        _tl.flask_app = _ca._get_current_object()
    except RuntimeError:
        _tl.flask_app = None

    if provider == "vertex_ai":
        return _run_vertex_analysis(
            video_gcs_url=video_gcs_url,
            video_mime_type=video_mime_type,
            child_name=child_name,
            child_age_months=child_age_months,
            model_name=model_name,
            vertex_config=vertex_config,
        )

    # --- AI Studio (ADK) path ---
    MAX_RETRIES = 5
    RETRY_BACKOFF_BASE = 10  # seconds

    def _is_retryable(exc: Exception) -> bool:
        """Check if an exception is a transient API error worth retrying."""
        exc_str = str(exc)
        # 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, 500 INTERNAL
        if any(code in exc_str for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED")):
            return True
        return False

    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
      try:
        mgr = get_video_analysis_manager()
        runner = mgr.get_or_create_runner(api_key, model_name)

        session_id = f"va_{user_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
        mgr.ensure_session(user_id, session_id)

        # Download video bytes for multimodal input (only on first attempt)
        if attempt == 1:
            file_data = gcp_bucket.download_file_from_gcs(video_gcs_url)

        # Build the initial user message with video + context
        age_bracket = _get_age_bracket(child_age_months)

        initial_message = (
            f"請分析以下兒童發展影片。\n\n"
            f"兒童資料：\n"
            f"- 姓名：{child_name}\n"
            f"- 年齡：{child_age_months:.1f} 個月\n"
            f"- 年齡段：{age_bracket} 個月\n\n"
            f"請使用 get_age_standards 工具取得該年齡段的發展標準，然後依照你的指令進行分析。"
        )

        content_parts = [
            types.Part.from_text(text=initial_message),
            types.Part.from_bytes(data=file_data, mime_type=video_mime_type),
        ]

        user_content = types.Content(role="user", parts=content_parts)

        # Run the sequential pipeline synchronously via thread
        result_holder: Dict[str, Any] = {"success": False, "error": None}
        collected_text: List[str] = []

        chunk_queue: queue.Queue = queue.Queue()
        exception_holder: List[Optional[Exception]] = [None]

        def _run_in_thread():
            try:
                thread_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(thread_loop)

                async def _stream():
                    try:
                        async for event in runner.run_async(
                            user_id=user_id,
                            session_id=session_id,
                            new_message=user_content,
                        ):
                            if hasattr(event, 'content') and event.content:
                                if hasattr(event.content, 'parts') and event.content.parts:
                                    for part in event.content.parts:
                                        if hasattr(part, 'text') and part.text:
                                            chunk_queue.put(part.text)
                    except Exception as e:
                        exception_holder[0] = e
                    finally:
                        chunk_queue.put(None)

                thread_loop.run_until_complete(_stream())
                thread_loop.close()
            except Exception as e:
                exception_holder[0] = e
                chunk_queue.put(None)

        thread = threading.Thread(target=_run_in_thread, daemon=True)
        thread.start()

        while True:
            chunk = chunk_queue.get(timeout=300)
            if chunk is None:
                break
            collected_text.append(chunk)

        thread.join(timeout=5)

        if exception_holder[0]:
            raise exception_holder[0]

        # The final agent output should be stored in state, but also available
        # as the last collected text. Try to parse it as JSON.
        full_output = "".join(collected_text).strip()

        # Use a helper to retrieve the session state
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            session = loop.run_until_complete(
                mgr._session_service.get_session(
                    app_name=mgr.APP_NAME,
                    user_id=user_id,
                    session_id=session_id,
                )
            )
            state = session.state if session else {}
        finally:
            loop.close()

        result_holder["transcription_result"] = _safe_parse(state.get("transcription_result", ""))
        result_holder["motor_analysis_result"] = _safe_parse(state.get("motor_analysis_result", ""))
        result_holder["language_analysis_result"] = _safe_parse(state.get("language_analysis_result", ""))
        result_holder["final_report"] = _safe_parse(state.get("final_report", "") or full_output)
        result_holder["success"] = True

        return result_holder

      except Exception as e:
        last_error = e
        if attempt < MAX_RETRIES and _is_retryable(e):
            wait_time = RETRY_BACKOFF_BASE * attempt
            logger.warning(
                f"Video analysis attempt {attempt}/{MAX_RETRIES} failed with retryable error: {e}. "
                f"Retrying in {wait_time}s..."
            )
            import time
            time.sleep(wait_time)
            continue
        logger.error(f"Video analysis failed (attempt {attempt}/{MAX_RETRIES}): {e}")
        traceback.print_exc()
        return {"success": False, "error": str(e)}

    # All retries exhausted
    return {"success": False, "error": f"All {MAX_RETRIES} attempts failed: {last_error}"}


def _run_vertex_analysis(
    video_gcs_url: str,
    video_mime_type: str,
    child_name: str,
    child_age_months: float,
    model_name: str = "gemini-2.0-flash",
    vertex_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run analysis using Vertex AI direct (non-ADK) for service account auth."""
    if not vertex_config:
        return {"success": False, "error": "Vertex AI config not provided"}

    service_account_json = vertex_config.get("service_account")
    project_id = vertex_config.get("project_id")
    location = vertex_config.get("location", "us-central1")

    if not service_account_json or not project_id:
        return {"success": False, "error": "Vertex AI service account / project required"}

    MAX_RETRIES = 5
    RETRY_BACKOFF_BASE = 10  # seconds
    last_error: Optional[Exception] = None

    try:
        import time as _time
        import vertexai
        from vertexai.generative_models import GenerativeModel, Part
        from google.oauth2 import service_account

        creds_info = json.loads(service_account_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_info, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        vertexai.init(project=project_id, location=location, credentials=credentials)

        file_data = gcp_bucket.download_file_from_gcs(video_gcs_url)
        age_bracket = _get_age_bracket(child_age_months)

        prompt = (
            f"你是一位兒童發展專家。請分析以下影片中的兒童，評估其身體發展（粗大動作、精細動作）"
            f"以及語言發展是否符合其年齡段的發展標準。\n\n"
            f"兒童資料：\n"
            f"- 姓名：{child_name}\n"
            f"- 年齡：{child_age_months:.1f} 個月\n"
            f"- 年齡段：{age_bracket} 個月\n\n"
            f"請根據你對該年齡段發展標準的知識進行評估。\n\n"
            f"請以 JSON 格式輸出完整報告，包含以下欄位：\n"
            f"report_title, child_name, child_age_months, analysis_date, executive_summary,\n"
            f"motor_development (status, findings, strengths, concerns, recommendations),\n"
            f"language_development (status, findings, strengths, concerns, recommendations),\n"
            f"overall_recommendations, professional_referral_needed, referral_reason\n\n"
            f"所有文字使用繁體中文。只輸出 JSON，不要其他文字。"
        )

        model = GenerativeModel(model_name)
        content_parts = [
            Part.from_text(prompt),
            Part.from_data(data=file_data, mime_type=video_mime_type),
        ]

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = model.generate_content(
                    content_parts,
                    generation_config={
                        "temperature": 0.3,
                        "top_p": 0.90,
                        "max_output_tokens": 8192,
                    },
                )

                raw = response.text.strip() if response.text else ""
                parsed = _safe_parse(raw)

                return {
                    "success": True,
                    "transcription_result": {},
                    "motor_analysis_result": parsed.get("motor_development", {}),
                    "language_analysis_result": parsed.get("language_development", {}),
                    "final_report": parsed,
                }
            except Exception as api_err:
                last_error = api_err
                err_str = str(api_err)
                is_retryable = any(code in err_str for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "Socket closed"))
                if attempt < MAX_RETRIES and is_retryable:
                    wait_time = RETRY_BACKOFF_BASE * attempt
                    logger.warning(
                        f"Vertex AI attempt {attempt}/{MAX_RETRIES} failed: {api_err}. "
                        f"Retrying in {wait_time}s..."
                    )
                    _time.sleep(wait_time)
                    continue
                raise

        # All retries exhausted (shouldn't reach here, but just in case)
        return {"success": False, "error": f"All {MAX_RETRIES} attempts failed: {last_error}"}

    except Exception as e:
        logger.error(f"Vertex video analysis failed: {e}")
        traceback.print_exc()
        return {"success": False, "error": str(e)}


def _safe_parse(text) -> Any:
    """Try to parse JSON from text, return as-is if not JSON."""
    if isinstance(text, dict):
        return text
    if isinstance(text, list):
        return text
    if not isinstance(text, str) or not text.strip():
        return {}
    # Strip markdown code fences
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first and last lines (code fences)
        if len(lines) >= 2:
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return {"raw_text": text}
