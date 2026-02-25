import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/change-requests/[id] - Get single change request
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Änderungsantrag nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, changeRequest.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(changeRequest);
  } catch (error) {
    console.error("Error fetching change request:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Änderungsantrags" },
      { status: 500 }
    );
  }
}

// PUT /api/change-requests/[id] - Update change request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.changeRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Änderungsantrag nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.changeType !== undefined) updateData.changeType = body.changeType;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.risksBefore !== undefined) updateData.risksBefore = body.risksBefore || null;
    if (body.risksAfter !== undefined) updateData.risksAfter = body.risksAfter || null;
    if (body.mitigations !== undefined) updateData.mitigations = body.mitigations || null;

    if (body.status !== undefined) {
      updateData.status = body.status;
      // If status changes to GENEHMIGT, set approvedById and approvedAt
      if (body.status === "GENEHMIGT" && existing.status !== "GENEHMIGT") {
        updateData.approvedById = session.user.id;
        updateData.approvedAt = new Date();
      }
      // If status changes to UMGESETZT, set implementedAt
      if (body.status === "UMGESETZT" && existing.status !== "UMGESETZT") {
        updateData.implementedAt = new Date();
      }
      // If status changes to ABGELEHNT, also record who did it
      if (body.status === "ABGELEHNT" && existing.status !== "ABGELEHNT") {
        updateData.approvedById = session.user.id;
        updateData.approvedAt = new Date();
      }
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "change_request",
      entityId: params.id,
      details: { status: body.status },
    });

    return NextResponse.json(changeRequest);
  } catch (error) {
    console.error("Error updating change request:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Änderungsantrags" },
      { status: 500 }
    );
  }
}

// DELETE /api/change-requests/[id] - Delete change request (only if BEANTRAGT)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id: params.id },
    });

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Änderungsantrag nicht gefunden" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "BEANTRAGT") {
      return NextResponse.json(
        { error: "Nur beantragte Änderungsanträge können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, changeRequest.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.changeRequest.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "change_request",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting change request:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Änderungsantrags" },
      { status: 500 }
    );
  }
}
