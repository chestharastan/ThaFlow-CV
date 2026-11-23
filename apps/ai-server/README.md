# ThaFlow CV AI server

Optional, stateless inference API for the web app's **Cloud AI** mode. The web app works fully without it.

## Run

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...            # read by the Anthropic SDK
export THAFLOW_ALLOWED_ORIGINS=https://your-web-app.example
uvicorn app.main:app --factory --host 0.0.0.0 --port 8000 --no-access-log
```

Then enter the server's address under **Settings → AI assistance → Cloud AI** in the web app.
Serve it over HTTPS in production: the browser will refuse to call an `http://` API from an `https://` page.

| Variable | Default | Purpose |
| --- | --- | --- |
| `THAFLOW_AI_PROVIDER` | `anthropic` | `anthropic`, or `mock` (deterministic, calls no model; for development) |
| `THAFLOW_AI_MODEL` | `claude-opus-5-5` | Model id |
| `THAFLOW_AI_EFFORT` | `low` | Reasoning effort; these are short rewriting tasks |
| `THAFLOW_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated web-app origins allowed by CORS |
| `THAFLOW_RATE_LIMIT_PER_MINUTE` | `20` | Per client address, in memory |

## API

`POST /v1/tasks` with exactly one task and only the text it needs:

```json
{ "task": "rewrite_text", "language": "en", "content": { "text": "I build websites using React", "kind": "experience" } }
```

```json
{ "success": true, "result": { "text": "Developed websites using React." } }
```

Tasks: `rewrite_text`, `translate_text`, `extract_section`. Unknown fields are rejected, so a client
cannot attach an id or a whole CV. See `app/schemas.py`.

## Privacy properties

- No database, cache or file writes; nothing about a request survives the response.
- Bodies are never logged. One metadata line per request: task name, status, duration.
  Keep `--no-access-log` or an equivalent at your proxy if you do not want client addresses logged either.
- No cookies or credentials (`allow_credentials` is off).
- The text is sent on to the model provider you configure, under that provider's data-retention terms.
  Tell your users who that is.

## Test

```bash
pip install -r requirements-dev.txt
pytest
```

## Adding a provider

Implement `InferenceProvider` (`app/providers/base.py`) and register it in `build_provider` in `app/main.py`.
