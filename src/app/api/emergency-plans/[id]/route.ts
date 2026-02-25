import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/emergency-plans/[id] - Get single emergency plan with all relations
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const plan = await prisma.emergencyPlan.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        drills: {
          orderBy: { drillDate: "desc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Notfallplan nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, plan.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error fetching emergency plan:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Notfallplans" },
      { status: 500 }
    );
  }
}

// PUT /api/emergency-plans/[id] - Update emergency plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.emergencyPlan.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Notfallplan nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.emergencyType !== undefined) updateData.emergencyType = body.emergencyType;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.procedures !== undefined) updateData.procedures = body.procedures;
    if (body.responsiblePersons !== undefined) {
      updateData.responsiblePersons = body.responsiblePersons
        ? JSON.parse(JSON.stringify(body.responsiblePersons))
        : null;
    }
    if (body.emergencyNumbers !== undefined) {
      updateData.emergencyNumbers = body.emergencyNumbers
        ? JSON.parse(JSON.stringify(body.emergencyNumbers))
        : null;
    }
    if (body.documentPath !== undefined) updateData.documentPath = body.documentPath;
    if (body.lastDrillDate !== undefined) {
      updateData.lastDrillDate = body.lastDrillDate ? new Date(body.lastDrillDate) : null;
    }
    if (body.nextDrillDate !== undefined) {
      updateData.nextDrillDate = body.nextDrillDate ? new Date(body.nextDrillDate) : null;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Increment version on every update
    updateData.version = existing.version + 1;

    const plan = await prisma.emergencyPlan.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        drills: {
          orderBy: { drillDate: "desc" },
        },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "emergency_plan",
      entityId: params.id,
      details: { version: plan.version },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error updating emergency plan:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Notfallplans" },
      { status: 500 }
    );
  }
}

// DELETE /api/emergency-plans/[id] - Soft delete (set isActive=false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const plan = await prisma.emergencyPlan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Notfallplan nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, plan.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.emergencyPlan.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "emergency_plan",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting emergency plan:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Notfallplans" },
      { status: 500 }
    );
  }
}
