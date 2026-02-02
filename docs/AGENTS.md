# docs/ — Project Documentation

## OVERVIEW
Feature specs + deployment guides. Architecture, video assessments, PDF handling, API key flows, and deployment checklists for XIAOICE.

## WHERE TO LOOK

| Doc | Purpose |
|-----|---------|
| MULTI_AGENT_SYSTEM_ARCHITECTURE.md | ADK coordinator + pdf/media agents, session mgmt, file handling, streaming |
| DEPLOYMENT_CHECKLIST.md | Pre-deploy checks, rollback plan, security validation, cache clearing steps |
| PDF_FEATURE.md | PDF text extraction, max pages, code examples, error handling |
| API_KEY_FLOW_DIAGRAM.md | JWT → user_id → selected_api_key_id → decryption → multi-agent calls |
| VIDEO_ASSESSMENT_GUIDE.md | Child dev assessment flow, video demo Q&A, scoring, UI walkthrough |
| VIDEO_ANALYSIS_GUIDE.md | Media upload + analysis feature, supported formats, usage |
| VIDEO_SETUP_GUIDE.md | Setup instructions for video features |
| INTEGRATION_COMPLETE.md | Chat + assessment system integration notes |

## CONVENTIONS
- Architecture docs include ASCII diagrams for flows.
- Code snippets show Python/JS examples.
- Guides written for end-users (assessment guides) vs. devs (architecture, API flow).
- All deployment docs include rollback procedures.
- Video assessment: see VIDEO_* guides for scoring and flow details.

## ANTI-PATTERNS
- Avoid duplicating architecture diagrams across docs; link to MULTI_AGENT_SYSTEM_ARCHITECTURE.md.
- Do NOT document secrets or env vars; reference `.env.example` instead.
- Keep user guides separate from tech specs.

## NOTES
- MULTI_AGENT_SYSTEM_ARCHITECTURE.md is canonical for ADK agent design; update if chat_agent.py changes.
- VIDEO_* docs cover child assessment feature; UI templates live under app/templates.
- PDF_FEATURE.md may be outdated if ADK replaced standalone pdf reading (check `app/agent/chat_agent.py` for current impl).
- Deployment checklist references backups/ dir (not in repo; assumed local).
