import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { isOverdue } from "@/lib/inspection-prefill";

// GET /api/inspections/[id]/item-checks
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, inspection.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const itemChecks = await prisma.inspectionItemCheck.findMany({
      where: { inspectionId: params.id },
      select: {
        id: true,
        templateItemId: true,
        status: true,
        note: true,
        checkedAt: true,
        lastTestDate: true,
        nextTestDate: true,
      },
    });

    return NextResponse.json(itemChecks);
  } catch (error) {
    console.error("Error fetching item checks:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Prüfungen" },
      { status: 500 }
    );
  }
}

// POST /api/inspections/[id]/item-checks
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateItemId, note, lastTestDate, nextTestDate } = body;
    type Status = "IO" | "MANGEL" | "UNCHECKED" | "NICHT_RELEVANT";

    if (!templateItemId) {
      return NextResponse.json(
        { error: "templateItemId ist erforderlich" },
        { status: 400 }
      );
    }

    if (body.status !== undefined && !["IO", "MANGEL", "UNCHECKED", "NICHT_RELEVANT"].includes(body.status)) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      select: { companyId: true, status: true, inspectionDate: true },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, inspection.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    if (inspection.status !== "DRAFT" && inspection.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Begehung kann nicht mehr bearbeitet werden" },
        { status: 400 }
      );
    }

    // undefined = keep the stored value, "" / null = clear it
    const toDate = (v: unknown) => (v === undefined ? undefined : v ? new Date(v as string) : null);
    const last = toDate(lastTestDate);
    const next = toDate(nextTestDate);

    // Item no longer NEIN and the user confirmed: its findings (e.g. carried over from last year) go
    let removedFindings = 0;
    if (body.removeFindings === true && body.status && body.status !== "MANGEL") {
      const res = await prisma.inspectionFinding.deleteMany({ where: { inspectionId: params.id, templateItemId } });
      removedFindings = res.count;
    }

    // Same rule as the GoodNotes import: "JA" with a test date before the inspection date is overdue → Mangel
    const existing = await prisma.inspectionItemCheck.findUnique({
      where: { inspectionId_templateItemId: { inspectionId: params.id, templateItemId } },
      select: { nextTestDate: true, status: true },
    });
    // Without a status the stored one is kept (e.g. when only dates/remarks are entered)
    let status: Status = body.status ?? existing?.status ?? "UNCHECKED";
    const effectiveNext = next !== undefined ? next : existing?.nextTestDate ?? null;
    let autoMangel: string | null = null;
    if (status === "IO" && isOverdue(effectiveNext, inspection.inspectionDate)) {
      status = "MANGEL";
      autoMangel = `Prüftermin ${effectiveNext!.toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" })} vor dem Begehungsdatum – überfällig`;
    }

    const itemCheck = await prisma.inspectionItemCheck.upsert({
      where: {
        inspectionId_templateItemId: {
          inspectionId: params.id,
          templateItemId,
        },
      },
      update: {
        status,
        // Only overwrite the remark when the client sends one (status clicks must not wipe imported names/notes)
        ...(note !== undefined && { note: note || null }),
        checkedAt: status !== "UNCHECKED" ? new Date() : null,
        ...(last !== undefined && { lastTestDate: last }),
        ...(next !== undefined && { nextTestDate: next }),
      },
      create: {
        inspectionId: params.id,
        templateItemId,
        status,
        note: note || null,
        checkedAt: status !== "UNCHECKED" ? new Date() : null,
        lastTestDate: last ?? null,
        nextTestDate: next ?? null,
      },
    });

    // An automatic Mangel needs a finding so it shows up in the report
    let findingCreated = false;
    if (autoMangel) {
      const hasFinding = await prisma.inspectionFinding.count({
        where: { inspectionId: params.id, templateItemId },
      });
      if (!hasFinding) {
        const item = await prisma.inspectionTemplateItem.findUnique({
          where: { id: templateItemId },
          select: { label: true, sectionId: true, suggestedMeasure: true, defaultRiskLevel: true },
        });
        const count = await prisma.inspectionFinding.count({ where: { inspectionId: params.id } });
        if (item) {
          await prisma.inspectionFinding.create({
            data: {
              inspectionId: params.id,
              sectionId: item.sectionId,
              templateItemId,
              findingNumber: count + 1,
              description: `${item.label}: ${autoMangel}`,
              measure: item.suggestedMeasure,
              riskLevel: item.defaultRiskLevel ?? "MITTEL",
            },
          });
          findingCreated = true;
        }
      }
    }

    return NextResponse.json({ ...itemCheck, autoMangel, findingCreated, removedFindings });
  } catch (error) {
    console.error("Error saving item check:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Prüfung" },
      { status: 500 }
    );
  }
}
