import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { renderPdfPages } from "@/lib/inspection-import/render-pages";
import { transcribePages } from "@/lib/inspection-import/transcribe";
import { describeAiError } from "@/lib/inspection-import/client";
import { startJob } from "@/lib/inspection-import/jobs";

const MAX_PAGES = 40;

// POST /api/inspection-import/transcribe – GoodNotes PDF → verbatim transcription (handwriting included)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("pdf");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine PDF-Datei übermittelt" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json({ error: "Die Datei ist kein PDF" }, { status: 400 });
    }

    const pages = await renderPdfPages(buffer);
    if (pages.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `Das PDF hat ${pages.length} Seiten (maximal ${MAX_PAGES}).` },
        { status: 400 }
      );
    }

    // Runs in the background (1–2 min for 11 pages); the page polls /api/inspection-import/jobs/[id]
    const jobId = startJob(session.user.id, "Transcription", async () => {
      const { transcript, costUsd } = await transcribePages(pages, randomUUID());
      return { transcript, pageCount: pages.length, costUsd };
    });
    return NextResponse.json({ jobId, pageCount: pages.length }, { status: 202 });
  } catch (error) {
    console.error("Transcription error:", error);
    const { message, status } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
