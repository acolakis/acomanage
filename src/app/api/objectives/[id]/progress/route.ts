import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/objectives/[id]/progress - List progress entries
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const objective = await prisma.ohsObjective.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!objective) {
      return NextResponse.json(
        { error: "SGA-Ziel nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, objective.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const progress = await prisma.objectiveProgress.findMany({
      where: { objectiveId: params.id },
      orderBy: { recordedAt: "desc" },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Fortschritte" },
      { status: 500 }
    );
  }
}

// POST /api/objectives/[id]/progress - Add progress entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const objective = await prisma.ohsObjective.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!objective) {
      return NextResponse.json(
        { error: "SGA-Ziel nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, objective.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const { value, note } = body;

    if (!value) {
      return NextResponse.json(
        { error: "Wert ist erforderlich" },
        { status: 400 }
      );
    }

    const progress = await prisma.objectiveProgress.create({
      data: {
        objectiveId: params.id,
        value,
        note: note || null,
        recordedById: session.user.id,
      },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(progress, { status: 201 });
  } catch (error) {
    console.error("Error adding progress:", error);
    return NextResponse.json(
      { error: "Fehler beim Hinzufügen des Fortschritts" },
      { status: 500 }
    );
  }
}
