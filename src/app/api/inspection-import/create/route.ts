import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { IMPORT_TEMPLATE_NAME } from "@/lib/inspection-import/template";
import type { ImportItemStatus } from "@/lib/inspection-import/types";
import { findPreviousInspection } from "@/lib/inspection-prefill";

interface CreateItem {
  itemKey: string;
  status: ImportItemStatus;
  note: string | null;
  lastTestDate: string | null;
  nextTestDate: string | null;
}

interface CreateFinding {
  itemKey: string | null;
  beschreibung: string;
  massnahme: string | null;
  risiko: "NIEDRIG" | "MITTEL" | "HOCH" | "KRITISCH";
}

const STATUSES = new Set(["IO", "MANGEL", "NICHT_RELEVANT", "UNCHECKED"]);
const RISKS = new Set(["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"]);
const toDate = (d: string | null | undefined) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) : null;

// POST /api/inspection-import/create – creates the inspection with all reviewed checklist answers in one transaction
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const companyId: string = body.companyId;
    const inspectionDate = toDate(body.inspectionDate);
    const items: CreateItem[] = Array.isArray(body.items) ? body.items : [];
    const findings: CreateFinding[] = Array.isArray(body.findings) ? body.findings : [];

    if (!companyId || !inspectionDate) {
      return NextResponse.json({ error: "Betrieb und Datum sind erforderlich" }, { status: 400 });
    }

    const template = await prisma.inspectionTemplate.findFirst({
      where: { name: IMPORT_TEMPLATE_NAME, isActive: true },
      include: { sections: { include: { items: { select: { id: true, itemKey: true } } } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Begehungsvorlage A00–XYZ03 fehlt" }, { status: 500 });
    }
    const byKey = new Map<string, { id: string; sectionId: string }>();
    for (const s of template.sections) for (const i of s.items) byKey.set(i.itemKey, { id: i.id, sectionId: s.id });

    const year = inspectionDate.getFullYear();
    const count = await prisma.inspection.count({
      where: { inspectionDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
    const inspectionNumber = `BEG-${year}-${String(count + 1).padStart(3, "0")}`;

    const previous = await findPreviousInspection({ companyId, templateId: template.id, before: inspectionDate });

    const inspection = await prisma.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          companyId,
          templateId: template.id,
          previousInspectionId: previous?.id ?? null,
          inspectionNumber,
          inspectionDate,
          inspectionType: "REGULAR",
          inspectorId: session.user.id,
          attendees: body.attendees || null,
          generalNotes: body.generalNotes || null,
          status: "IN_PROGRESS",
        },
      });

      const checks = items
        .filter((i) => byKey.has(i.itemKey) && STATUSES.has(i.status) && i.status !== "UNCHECKED")
        .map((i) => ({
          inspectionId: created.id,
          templateItemId: byKey.get(i.itemKey)!.id,
          status: i.status,
          note: i.note || null,
          checkedAt: new Date(),
          lastTestDate: toDate(i.lastTestDate),
          nextTestDate: toDate(i.nextTestDate),
        }));
      if (checks.length) await tx.inspectionItemCheck.createMany({ data: checks, skipDuplicates: true });

      let n = 1;
      for (const f of findings) {
        if (!f.beschreibung?.trim()) continue;
        const ref = f.itemKey ? byKey.get(f.itemKey) : undefined;
        await tx.inspectionFinding.create({
          data: {
            inspectionId: created.id,
            findingNumber: n++,
            description: f.beschreibung.trim(),
            measure: f.massnahme || null,
            riskLevel: RISKS.has(f.risiko) ? f.risiko : "MITTEL",
            sectionId: ref?.sectionId ?? null,
            templateItemId: ref?.id ?? null,
          },
        });
      }
      return created;
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "inspection",
      entityId: inspection.id,
      details: { number: inspectionNumber, source: "goodnotes-import" },
    });

    return NextResponse.json({ id: inspection.id }, { status: 201 });
  } catch (error) {
    console.error("Import create error:", error);
    return NextResponse.json({ error: "Fehler beim Anlegen der Begehung" }, { status: 500 });
  }
}
