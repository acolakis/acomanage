import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/objectives/[id] - Get objective with all details
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
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        progress: {
          orderBy: { recordedAt: "desc" },
          include: {
            recordedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
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

    return NextResponse.json(objective);
  } catch (error) {
    console.error("Error fetching objective:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des SGA-Ziels" },
      { status: 500 }
    );
  }
}

// PUT /api/objectives/[id] - Update objective
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.ohsObjective.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "SGA-Ziel nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue;
    if (body.currentValue !== undefined) updateData.currentValue = body.currentValue;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.responsibleId !== undefined) updateData.responsibleId = body.responsibleId || null;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.targetDate !== undefined) updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    if (body.isoClause !== undefined) updateData.isoClause = body.isoClause;
    if (body.relatedRiskId !== undefined) updateData.relatedRiskId = body.relatedRiskId;

    const objective = await prisma.ohsObjective.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "ohs_objective",
      entityId: params.id,
      details: { status: body.status },
    });

    return NextResponse.json(objective);
  } catch (error) {
    console.error("Error updating objective:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des SGA-Ziels" },
      { status: 500 }
    );
  }
}

// DELETE /api/objectives/[id] - Delete objective (only ENTWURF status)
export async function DELETE(
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
    });

    if (!objective) {
      return NextResponse.json(
        { error: "SGA-Ziel nicht gefunden" },
        { status: 404 }
      );
    }

    if (objective.status !== "ENTWURF") {
      return NextResponse.json(
        { error: "Nur Ziele im Entwurf-Status können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, objective.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.ohsObjective.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "ohs_objective",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting objective:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des SGA-Ziels" },
      { status: 500 }
    );
  }
}
