# TEST DIRECTORY

## OVERVIEW
Pytest-based test suite for XIAOICE. Tests verify pose detection JS modules, multi-agent AI system, and API key management. No pytest.ini—tests are file-based with manual/integration components.

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Pose module tests | test_3d_pose_module_initialization.py | Reads JS files from app/static/js/, app/pose_detection/; verifies class definitions, methods, config options |
| Multi-agent system | test_multi_agent.py | Integration test; demonstrates ADK coordinator routing to text/media agents; requires active API key |
| API key validation | check_api_keys.py | Utility script; queries UserApiKey table, decrypts keys, verifies ENCRYPTION_KEY |

## CONVENTIONS
- Tests use `Path(__file__).parent.parent` to locate app/ directory from test/.
- Pose detection tests validate JS source via string matching (`assert 'class PoseDetector3D' in content`).
- Multi-agent test streams responses via `generate_streaming_response()` generator.
- API key tests rely on Flask app context for database access.

## ANTI-PATTERNS
- DO NOT create fixtures that depend on GCS—mock `gcp_bucket.py` functions instead.
- DO NOT hardcode paths—use Path() for cross-platform compatibility.
- Avoid global API keys in tests—use `get_test_api_key()` to fetch from DB or .env.

## NOTES
- test_3d_pose_module_initialization.py: 563 lines; validates MediaPipe integration, movement analyzers, descriptor generator.
- test_multi_agent.py: Demonstrates text agent routing, Chinese language support, media request simulation (no file upload).
- check_api_keys.py: Read-only utility; masks displayed keys (`first6***last6`).
- Run pytest from repo root: `pytest` or `pytest test/test_multi_agent.py -v`.
- Some tests require Flask app context; test_multi_agent may prompt user for input between tests.
