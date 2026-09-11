# SiteFlow AI — FastAPI Backend Service Shell

Enterprise REST API shell for SiteFlow AI platform.

## Setup & Running

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /` — API Information
- `GET /api/health` — Health check endpoint
