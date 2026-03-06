"""
CukaiGate OCR Service
─────────────────────
FastAPI + Claude Vision for token-efficient LHDN receipt scanning.

Architecture:
  • One multimodal Claude call per receipt (image + structured prompt).
  • Returns JSON: { amount, category, confidence, raw_text }
  • No intermediate OCR step — Claude reads and categorises in one shot.
"""

from __future__ import annotations

import base64
import io
import json
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    print("WARNING: ANTHROPIC_API_KEY not set - OCR will fail until configured")

# claude-haiku-4-5 is the fastest and most cost-efficient Claude model — ideal for OCR
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# ── Model & Schemas ─────────────────────────────────────────────────────────

LHDN_CATEGORIES = [
    "LIFESTYLE", "MEDICAL", "EDUCATION", "EPF", "SSPN",
    "CHILDCARE", "CHILD_PRIMARY", "CHILD_TERTIARY", "OTHER",
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

SYSTEM_PROMPT = f"""You are a receipt OCR engine. Extract tax relief information and respond with ONLY a JSON object — no explanation, no markdown, no extra text.

JSON format (strictly follow this):
{{"amount": <grand total as float>, "category": "<category>", "confidence": <0.0-1.0>, "raw_text": "<merchant name, max 40 chars>"}}

Rules:
- amount: The GRAND TOTAL in RM (e.g. 5378.0). Use null if not found.
- category: Pick exactly one from: {", ".join(LHDN_CATEGORIES)}
- confidence: Your extraction confidence between 0.0 and 1.0.
- raw_text: Merchant/store name only. Max 40 characters. Never cut a word in half.

Categories Guide:
{CATEGORY_HINTS}""".strip()


class OcrResult(BaseModel):
    amount: float | None
    category: str
    confidence: float
    raw_text: str


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="CukaiGate OCR", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


def _resize_for_claude(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """Resize image to max_size on the longest side to reduce token usage."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _parse_claude_json(text: str) -> dict:
    """
    Robustly extract JSON from Claude's response.
    Claude with a strict system prompt returns clean JSON, but this handles
    edge cases like accidental markdown fences or surrounding whitespace.
    """
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1].lstrip("json").strip() if len(parts) >= 2 else text
    # Extract outermost {...} in case of any preamble
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]
    return json.loads(text)


@app.post("/ocr", response_model=OcrResult)
async def scan_receipt(file: UploadFile = File(...)) -> OcrResult:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    raw = await file.read()
    try:
        resized = _resize_for_claude(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}") from e

    b64 = base64.b64encode(resized).decode()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=256,  # JSON payload is ~60 tokens; 256 is a safe ceiling
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": "Extract the receipt data as JSON."},
                    ],
                }
            ],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e}") from e

    stop_reason = response.stop_reason
    raw_text = response.content[0].text if response.content else ""
    print(f"[OCR] Stop reason: {stop_reason}")
    print(f"[OCR] Full Claude response: {raw_text}")

    if stop_reason == "max_tokens":
        raise HTTPException(
            status_code=422,
            detail=f"Claude hit token limit mid-JSON. Raw: {raw_text[:300]}",
        )

    try:
        parsed = _parse_claude_json(raw_text)
    except (json.JSONDecodeError, ValueError, AttributeError) as e:
        print(f"[OCR] Parse error: {e}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse Claude response: {raw_text[:500]}",
        ) from e

    return OcrResult(
        amount=parsed.get("amount"),
        category=parsed.get("category", "OTHER"),
        confidence=float(parsed.get("confidence", 0.5)),
        raw_text=str(parsed.get("raw_text", ""))[:80],
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "CukaiGate OCR", "model": CLAUDE_MODEL}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)