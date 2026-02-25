import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";
import * as fs from "fs";
import * as path from "path";

// GET /api/incidents/[id] - Get incident with all details
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        investigatedBy: { select: { id: true, firstName: true, lastName: true } },
        photos: { orderBy: { sortOrder: "asc" } },
        actions: {
          include: {
            responsible: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, incident.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Vorfalls" },
      { status: 500 }
    );
  }
}

// PUT /api/incidents/[id] - Update incident
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.incidentType !== undefined) updateData.incidentType = body.incidentType;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "ABGESCHLOSSEN") {
        updateData.closedAt = new Date();
      }
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.affectedPerson !== undefined) updateData.affectedPerson = body.affectedPerson;
    if (body.affectedRole !== undefined) updateData.affectedRole = body.affectedRole;
    if (body.witnesses !== undefined) updateData.witnesses = body.witnesses;
    if (body.rootCause !== undefined) updateData.rootCause = body.rootCause;
    if (body.rootCauseCategory !== undefined) updateData.rootCauseCategory = body.rootCauseCategory;
    if (body.contributingFactors !== undefined) updateData.contributingFactors = body.contributingFactors;
    if (body.investigatedById !== undefined) updateData.investigatedById = body.investigatedById;
    if (body.investigatedAt !== undefined) updateData.investigatedAt = body.investigatedAt ? new Date(body.investigatedAt) : null;
    if (body.injuryType !== undefined) updateData.injuryType = body.injuryType;
    if (body.bodyPart !== undefined) updateData.bodyPart = body.bodyPart;
    if (body.lostWorkDays !== undefined) updateData.lostWorkDays = body.lostWorkDays;
    if (body.bgReportable !== undefined) updateData.bgReportable = body.bgReportable;
    if (body.bgReportDate !== undefined) updateData.bgReportDate = body.bgReportDate ? new Date(body.bgReportDate) : null;
    if (body.bgReportNumber !== undefined) updateData.bgReportNumber = body.bgReportNumber;
    if (body.incidentTime !== undefined) updateData.incidentTime = body.incidentTime;

    const incident = await prisma.incident.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId: session.user.id, action: "update", entityType: "incident", entityId: params.id, details: { status: body.status } });

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Vorfalls" },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id] - Delete incident (only GEMELDET status)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    if (incident.status !== "GEMELDET") {
      return NextResponse.json(
        { error: "Nur gemeldete Vorfälle können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, incident.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Delete photo files from filesystem
    const photos = await prisma.incidentPhoto.findMany({
      where: { incidentId: params.id },
      select: { filePath: true },
    });
    for (const photo of photos) {
      const filePath = path.join(process.cwd(), photo.filePath);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
    // Try to remove directory
    const photoDir = path.join(process.cwd(), "uploads", "incidents", params.id);
    if (fs.existsSync(photoDir)) {
      try { fs.rmdirSync(photoDir); } catch { /* ignore */ }
    }

    await prisma.incident.delete({ where: { id: params.id } });

    logAudit({ userId: session.user.id, action: "delete", entityType: "incident", entityId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting incident:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Vorfalls" },
      { status: 500 }
    );
  }
}
