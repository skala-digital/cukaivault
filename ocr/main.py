"""
CukaiGate OCR Service
─────────────────────
FastAPI + Gemini Vision for token-efficient LHDN receipt scanning.

Architecture:
  • One multimodal Gemini call per receipt (image + structured prompt).
  • Returns JSON: { amount, category, confidence, raw_text }
  • No intermediate OCR step — Gemini reads and categorises in one shot.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
from typing import Literal

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️  WARNING: GEMINI_API_KEY not set - OCR will fail until configured")
    GEMINI_API_KEY = "dummy-key-for-startup"  # Allow startup but API calls will fail

genai.configure(api_key=GEMINI_API_KEY)

# ── Model ────────────────────────────────────────────────────────────────────

LHDN_CATEGORIES = Literal[
    "LIFESTYLE",
    "MEDICAL",
    "EDUCATION",
    "EPF",
    "SSPN",
    "CHILDCARE",
    "CHILD_PRIMARY",
    "CHILD_TERTIARY",
    "OTHER",
]

CATEGORY_HINTS = """
LIFESTYLE  - books, magazines, newspapers, computers, phones, tablets, internet
             subscription, sports equipment, gym membership, bicycles
MEDICAL    - hospital bills, clinic, medicine, dental, optical, medical examination,
             vaccination, mental health
EDUCATION  - tuition fees, university, college, PTPTN, professional courses, skills
SSPN       - SSPN (Tabung SSPN) savings deposit slip
EPF        - EPF / KWSP contribution, SOCSO / PERKESO, EIS
CHILDCARE  - childcare centre, kindergarten fees
CHILD_PRIMARY   - school-age child (under 18) expenses
CHILD_TERTIARY  - university/college-age child (18+) expenses
OTHER      - anything else
"""

SYSTEM_PROMPT = f"""
You are a Malaysian tax receipt analyser. Extract info from the receipt image.

Return ONLY valid minified JSON with exactly these keys:
  amount     - total amount in RM as a number (e.g. 120.50). Use the GRAND TOTAL.
  category   - one of: LIFESTYLE, MEDICAL, EDUCATION, EPF, SSPN, CHILDCARE,
               CHILD_PRIMARY, CHILD_TERTIARY, OTHER
  confidence - your confidence 0.0–1.0
  raw_text   - the first 120 chars of visible text on the receipt

Category hints:
{CATEGORY_HINTS}

If you cannot determine the amount, set amount to null.
Output ONLY the JSON object, nothing else.
""".strip()


class OcrResult(BaseModel):
    amount: float | None
    category: str
    confidence: float
    raw_text: str


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="CukaiGate OCR", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


def _resize_for_gemini(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """Resize image to max_size on the longest side to reduce token usage."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _parse_gemini_json(text: str) -> dict:
    """Extract JSON from Gemini response, stripping any markdown fences."""
    text = text.strip()
    # strip ```json ... ``` fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


@app.post("/ocr", response_model=OcrResult)
async def scan_receipt(file: UploadFile = File(...)) -> OcrResult:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    raw = await file.read()
    try:
        resized = _resize_for_gemini(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}") from e

    b64 = base64.b64encode(resized).decode()

    model = genai.GenerativeModel("gemini-1.5-flash")

    try:
        response = model.generate_content(
            [
                SYSTEM_PROMPT,
                {
                    "mime_type": "image/jpeg",
                    "data": b64,
                },
            ],
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=256,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}") from e

    raw_response = response.text or ""

    try:
        parsed = _parse_gemini_json(raw_response)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse Gemini response: {raw_response!r}",
        ) from e

    return OcrResult(
        amount=parsed.get("amount"),
        category=parsed.get("category", "OTHER"),
        confidence=float(parsed.get("confidence", 0.5)),
        raw_text=str(parsed.get("raw_text", ""))[:120],
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "CukaiVault OCR"}


# ─── LHDN Scraper ────────────────────────────────────────────────────

import httpx
from bs4 import BeautifulSoup

LHDN_LATEST_NEWS_URL = "https://www.hasil.gov.my/en/latest-news/"

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "RELIEF": ["relief", "pelepasan", "rebate"],
    "DEADLINE": ["deadline", "tarikh", "due date", "submission"],
    "RATE": ["rate", "kadar", "bracket", "pcb", "mtd"],
    "FORM": ["form", "borang", "e-filing", "efiling"],
    "PENALTY": ["penalty", "penalti", "compound", "offence"],
}


def _classify(text: str) -> str:
    lower = text.lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            return cat
    return "GENERAL"


class ScrapedEntry(BaseModel):
    title: str
    url: str
    summary: str
    category: str


@app.post("/scrape", response_model=dict)
async def scrape_lhdn() -> dict:
    """Scrape LHDN latest-news page and return structured entries."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(LHDN_LATEST_NEWS_URL)
            resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Scrape failed: {e}") from e

    soup = BeautifulSoup(resp.text, "html.parser")
    entries: list[dict] = []

    # LHDN news items are typically <article> or <li> blocks with an <a> and date
    for el in soup.select("article, .news-item, li.item"):
        a_tag = el.find("a", href=True)
        if not a_tag:
            continue
        title = a_tag.get_text(" ", strip=True)
        if not title or len(title) < 8:
            continue
        href: str = a_tag["href"]
        if not href.startswith("http"):
            href = "https://www.hasil.gov.my" + href
        # Summary: first non-empty text block after the title link
        summary_tag = el.find("p")
        summary = summary_tag.get_text(" ", strip=True)[:200] if summary_tag else ""
        entries.append(
            {"title": title, "url": href, "summary": summary, "category": _classify(title + " " + summary)}
        )

    # Deduplicate by URL
    seen: set[str] = set()
    unique: list[dict] = []
    for e in entries:
        if e["url"] not in seen:
            seen.add(e["url"])
            unique.append(e)

    return {"entries": unique[:30]}
