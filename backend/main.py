from datetime import datetime
from typing import Optional
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine, or_
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./event_leads.db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    company = Column(String(160), nullable=False)
    email = Column(String(200), nullable=False)
    event = Column(String(160), nullable=False)
    notes = Column(Text, nullable=False, default="")
    status = Column(String(40), nullable=False, default="To follow up")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)


class LeadBase(BaseModel):
    name: str
    company: str
    email: str
    event: str
    notes: str = ""
    status: str = "To follow up"


class LeadCreate(LeadBase):
    pass


class LeadUpdate(LeadBase):
    pass


class LeadOut(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


app = FastAPI(title="EventLead AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize(lead: Lead):
    return LeadOut.model_validate(lead)


def ai_client():
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the backend.",
        )
    return genai.Client(api_key=GEMINI_API_KEY)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/leads", response_model=list[LeadOut])
def list_leads(
    q: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Lead.name.ilike(term),
                Lead.company.ilike(term),
                Lead.email.ilike(term),
                Lead.event.ilike(term),
                Lead.notes.ilike(term),
            )
        )

    if status:
        query = query.filter(Lead.status == status)

    return query.order_by(Lead.created_at.desc()).all()


@app.post("/api/leads", response_model=LeadOut)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return serialize(lead)


@app.get("/api/leads/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return serialize(lead)


@app.put("/api/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
):
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for key, value in payload.model_dump().items():
        setattr(lead, key, value)

    lead.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lead)

    return serialize(lead)


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()

    return {"message": "Lead deleted"}


@app.post("/api/leads/{lead_id}/ai/summary")
def summarize_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if not lead.notes.strip():
        raise HTTPException(
            status_code=400,
            detail="Add interaction notes before generating a summary.",
        )

    client = ai_client()

    prompt = f"""You summarize business event conversations for a sales team.

Be concise and factual.
Return 2-4 bullet points.
Do not invent details.

Contact: {lead.name}
Company: {lead.company}
Event: {lead.event}

Interaction notes:
{lead.notes}
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        return {"result": response.text}

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(exc)}",
        )


@app.post("/api/leads/{lead_id}/ai/follow-up")
def draft_follow_up(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if not lead.notes.strip():
        raise HTTPException(
            status_code=400,
            detail="Add interaction notes before drafting a follow-up.",
        )

    client = ai_client()

    prompt = f"""Draft a concise, professional follow-up email after a business event.

Use only the supplied details.
Include a subject line and a short email.
Do not fabricate commitments, dates, pricing, or product details.

Contact: {lead.name}
Company: {lead.company}
Event: {lead.event}

Interaction notes:
{lead.notes}
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        return {"result": response.text}

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(exc)}",
        )