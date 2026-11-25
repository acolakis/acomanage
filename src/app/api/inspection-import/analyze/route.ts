import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeTranscript } from "@/lib/inspection-import/analyze";
import { loadOldReport } from "@/lib/inspection-import/old-report";
import { loadImportTemplate } from "@/lib/inspection-import/template";
import { describeAiError } from "@/lib/inspection-import/client";
import { startJob } from "@/lib/inspection-import/jobs";

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "–");

/** Summary of the company's last digital inspection on the same template, for the cross-check. */
async function previousChecksSummary(companyId: string, templateId: string, before: string | null) {
  const previous = await prisma.inspection.findFirst({
    where: {
      companyId,
      templateId,
      itemChecks: { some: {} },
      ...(before ? { inspectionDate: { lt: new Date(before) } } : {}),
    },
    orderBy: { inspectionDate: "desc" },
    include: {
      itemChecks: {
        where: { status: { not: "UNCHECKED" } },
        include: { templateItem: { select: { itemKey: true } } },
      },
    },
  });
  if (!previous || previous.itemChecks.length === 0) return null;
  const lines = previous.itemChecks.map(
    (c) =>
      `${c.templateItem.itemKey}: ${c.status}, letzte ${fmt(c.lastTestDate)}, nächste ${fmt(c.nextTestDate)}${c.note ? `, ${c.note}` : ""}`
  );
  return `Begehung vom ${fmt(previous.inspectionDate)}:\n${lines.join("\n")}`;
}

// POST /api/inspection-import/analyze – starts: transcription → checklist answers, cross-checked with last report
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  try {
    const { transcript, companyId, inspectionDate } = await request.json();
    if (typeof transcript !== "string" || !transcript.trim() || typeof companyId !== "string") {
      return NextResponse.json({ error: "Abschrift und Betrieb sind erforderlich" }, { status: 400 });
    }
    const date = typeof inspectionDate === "string" && inspectionDate ? inspectionDate : null;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Betrieb nicht gefunden" }, { status: 404 });
    }

    const template = await loadImportTemplate();
    if (!template) {
      return NextResponse.json(
        { error: "Begehungsvorlage A00–XYZ03 fehlt. Bitte prisma/seed-aws-begehung.ts ausführen." },
        { status: 500 }
      );
    }

    // Runs in the background (takes minutes); the page polls /api/inspection-import/jobs/[id]
    const jobId = startJob(session.user.id, "Analysis", async () => {
      const [oldReport, previousChecks] = await Promise.all([
        loadOldReport(company.name),
        previousChecksSummary(companyId, template.id, date),
      ]);
      const analysis = await analyzeTranscript({
        transcript,
        items: template.items,
        oldReport,
        previousChecks,
        inspectionDate: date,
        companyId,
      });
      const { costUsd, ...rest } = analysis;
      return { analysis: rest, costUsd, templateId: template.id, templateItems: template.items };
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    console.error("Analysis error:", error);
    const { message, status } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
