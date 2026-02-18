import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inspections - List all inspections
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;

  try {
    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        inspector: { select: { firstName: true, lastName: true } },
        _count: {
          select: { findings: true, photos: true },
        },
      },
      orderBy: { inspectionDate: "desc" },
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Begehungen" },
      { status: 500 }
    );
  }
}

// POST /api/inspections - Create a new inspection
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      companyId,
      templateId,
      inspectionType,
      inspectionDate,
      previousInspectionId,
      attendees,
      generalNotes,
    } = body;

    if (!companyId || !inspectionType || !inspectionDate) {
      return NextResponse.json(
        { error: "Betrieb, Typ und Datum sind erforderlich" },
        { status: 400 }
      );
    }

    // Generate inspection number
    const year = new Date(inspectionDate).getFullYear();
    const count = await prisma.inspection.count({
      where: {
        inspectionDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const inspectionNumber = `BEG-${year}-${String(count + 1).padStart(3, "0")}`;

    const inspection = await prisma.inspection.create({
      data: {
        companyId,
        templateId: templateId || null,
        inspectionNumber,
        inspectionDate: new Date(inspectionDate),
        inspectionType,
        previousInspectionId: previousInspectionId || null,
        inspectorId: session.user.id,
        attendees: attendees || null,
        generalNotes: generalNotes || null,
        status: "DRAFT",
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Begehung" },
      { status: 500 }
    );
  }
}
