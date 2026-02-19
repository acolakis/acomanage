import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";

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
    const { templateItemId, status, note, lastTestDate, nextTestDate } = await request.json();

    if (!templateItemId || !status) {
      return NextResponse.json(
        { error: "templateItemId und status sind erforderlich" },
        { status: 400 }
      );
    }

    if (!["IO", "MANGEL", "UNCHECKED", "NICHT_RELEVANT"].includes(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      select: { companyId: true, status: true },
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

    const itemCheck = await prisma.inspectionItemCheck.upsert({
      where: {
        inspectionId_templateItemId: {
          inspectionId: params.id,
          templateItemId,
        },
      },
      update: {
        status,
        note: note || null,
        checkedAt: status !== "UNCHECKED" ? new Date() : null,
        lastTestDate: lastTestDate ? new Date(lastTestDate) : undefined,
        nextTestDate: nextTestDate ? new Date(nextTestDate) : undefined,
      },
      create: {
        inspectionId: params.id,
        templateItemId,
        status,
        note: note || null,
        checkedAt: status !== "UNCHECKED" ? new Date() : null,
        lastTestDate: lastTestDate ? new Date(lastTestDate) : null,
        nextTestDate: nextTestDate ? new Date(nextTestDate) : null,
      },
    });

    return NextResponse.json(itemCheck);
  } catch (error) {
    console.error("Error saving item check:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Prüfung" },
      { status: 500 }
    );
  }
}
