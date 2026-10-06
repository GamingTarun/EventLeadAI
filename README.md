# EventLead AI — Even8 Full Stack Assignment

A full-stack AI Event Lead Manager built for the Even8 AI Native Full Stack Intern assignment.

## Stack

- Next.js + React
- FastAPI + Python
- SQLite with SQLAlchemy
- OpenAI API for note summaries and follow-up drafts
- Responsive custom CSS

## Features

- Create, edit, delete leads
- Search leads by name, company, event, or email
- Filter by follow-up status
- Store name, company, email, event, notes, and follow-up status
- AI summary of interaction notes
- AI-generated follow-up message
- Responsive dashboard UI
- REST API with FastAPI
- SQLite database with automatic table creation

## Project structure

```text
frontend/   Next.js application
backend/    FastAPI application
```

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
uvicorn main:app --reload --port 8000
```

Set `OPENAI_API_KEY` in `backend/.env` to enable AI features. The app still runs without it, and the API returns a clear configuration error if an AI action is requested.

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local   # Windows
# cp .env.local.example .env.local   # macOS/Linux
npm run dev
```

Open http://localhost:3000.

## Environment variables

Backend:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:///./event_leads.db
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API

- `GET /api/leads?q=&status=` — list/search/filter leads
- `POST /api/leads` — create lead
- `GET /api/leads/{id}` — get lead
- `PUT /api/leads/{id}` — update lead
- `DELETE /api/leads/{id}` — delete lead
- `POST /api/leads/{id}/ai/summary` — summarize notes
- `POST /api/leads/{id}/ai/follow-up` — draft follow-up
- `GET /api/health` — health check

## Deployment

The frontend can be deployed to Vercel. The FastAPI backend can be deployed to Render/Railway/Fly.io. Set the frontend `NEXT_PUBLIC_API_URL` to the deployed backend URL and configure the backend `OPENAI_API_KEY`.

## Key decisions

1. **SQLite:** The assignment explicitly permits SQLite. It keeps the project easy to run and review while still demonstrating relational persistence and API design.
2. **FastAPI:** Provides a small, explicit REST API and clean separation between UI and data/AI logic.
3. **AI on the server:** The OpenAI key is never exposed to the browser. The frontend calls the backend AI endpoints.
4. **Focused feature set:** The implementation prioritizes the required lead workflow, clean UX, database persistence, and two useful AI actions instead of adding unrelated features.
