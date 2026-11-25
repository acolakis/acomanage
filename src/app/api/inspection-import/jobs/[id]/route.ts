import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJob } from "@/lib/inspection-import/jobs";

export const dynamic = "force-dynamic";

// GET /api/inspection-import/jobs/[id] – state of a transcription/analysis job (polled by the import page)
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const job = getJob(params.id);
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Auftrag nicht gefunden – evtl. wurde der Server neu gestartet. Bitte erneut starten." },
      { status: 404 }
    );
  }
  if (job.status === "running") {
    return NextResponse.json({ status: "running", seconds: Math.round((Date.now() - job.startedAt) / 1000) });
  }
  if (job.status === "error") {
    return NextResponse.json({ status: "error", error: job.error });
  }
  return NextResponse.json({ status: "done", result: job.result });
}
