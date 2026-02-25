import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/audits/[id] - Get audit with all details
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audit = await prisma.internalAudit.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        findings: {
          include: {
            action: {
              select: {
                id: true,
                actionNumber: true,
                title: true,
                status: true,
                priority: true,
              },
            },
          },
          orderBy: { findingNumber: "asc" },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, audit.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(audit);
  } catch (error) {
    console.error("Error fetching audit:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Audits" },
      { status: 500 }
    );
  }
}

// PUT /api/audits/[id] - Update audit
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.internalAudit.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.auditType !== undefined) updateData.auditType = body.auditType;
    if (body.isoClause !== undefined) updateData.isoClause = body.isoClause || null;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "ABGESCHLOSSEN") {
        updateData.completedAt = new Date();
      }
    }
    if (body.plannedDate !== undefined) updateData.plannedDate = body.plannedDate ? new Date(body.plannedDate) : null;
    if (body.actualDate !== undefined) updateData.actualDate = body.actualDate ? new Date(body.actualDate) : null;
    if (body.auditorId !== undefined) updateData.auditorId = body.auditorId || null;
    if (body.auditees !== undefined) updateData.auditees = body.auditees || null;
    if (body.scope !== undefined) updateData.scope = body.scope || null;
    if (body.summary !== undefined) updateData.summary = body.summary || null;
    if (body.positiveFindings !== undefined) updateData.positiveFindings = body.positiveFindings || null;

    const audit = await prisma.internalAudit.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "internal_audit",
      entityId: params.id,
      details: { status: body.status },
    });

    return NextResponse.json(audit);
  } catch (error) {
    console.error("Error updating audit:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Audits" },
      { status: 500 }
    );
  }
}

// DELETE /api/audits/[id] - Delete audit (only GEPLANT status)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audit = await prisma.internalAudit.findUnique({
      where: { id: params.id },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (audit.status !== "GEPLANT") {
      return NextResponse.json(
        { error: "Nur geplante Audits können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, audit.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.internalAudit.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "internal_audit",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting audit:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Audits" },
      { status: 500 }
    );
  }
}
