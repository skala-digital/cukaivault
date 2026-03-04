import { NextRequest, NextResponse } from "next/server";

const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL ?? "http://127.0.0.1:8000";

/**
 * POST /api/ocr
 * Accepts multipart/form-data with a "file" field (image).
 * Proxies to the FastAPI OCR service and returns:
 *   { amount: number, category: string, confidence: number }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append("file", file);

    const response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: "POST",
      body: upstream,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[ocr proxy] upstream error:", text);
      return NextResponse.json(
        { error: "OCR service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[ocr proxy]", error);
    return NextResponse.json(
      { error: "Failed to reach OCR service" },
      { status: 502 }
    );
  }
}
