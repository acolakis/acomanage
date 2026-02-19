import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCompanyUsers } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";
import * as fs from "fs";
import * as path from "path";

// GET /api/inspections/[id] - Get inspection with all details
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
      include: {
        company: { select: { id: true, name: true, city: true } },
        inspector: { select: { firstName: true, lastName: true } },
        template: {
          include: {
            sections: {
              orderBy: { sortOrder: "asc" },
              include: {
                items: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    sectionId: true,
                    itemKey: true,
                    label: true,
                    description: true,
                    legalReference: true,
                    suggestedMeasure: true,
                    defaultRiskLevel: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
        findings: {
          orderBy: { findingNumber: "asc" },
          include: {
            section: { select: { title: true, sectionCode: true } },
            templateItem: { select: { label: true, itemKey: true } },
            photos: { orderBy: { sortOrder: "asc" } },
          },
        },
        photos: { orderBy: { sortOrder: "asc" } },
        itemChecks: {
          select: {
            id: true,
            templateItemId: true,
            status: true,
            note: true,
            checkedAt: true,
            lastTestDate: true,
            nextTestDate: true,
          },
        },
        previousInspection: {
          select: {
            id: true,
            inspectionNumber: true,
            inspectionDate: true,
            findings: {
              where: { status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] } },
              orderBy: { findingNumber: "asc" },
              include: {
                section: { select: { title: true } },
              },
            },
          },
        },
      },
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

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Begehung" },
      { status: 500 }
    );
  }
}

// PUT /api/inspections/[id] - Update inspection
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.attendees !== undefined) updateData.attendees = body.attendees;
    if (body.generalNotes !== undefined) updateData.generalNotes = body.generalNotes;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    const inspection = await prisma.inspection.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId: session.user.id, action: "update", entityType: "inspection", entityId: params.id, details: { status: body.status } });

    // Notify company users when inspection is completed
    if (body.status === "COMPLETED") {
      notifyCompanyUsers(inspection.companyId, {
        type: "inspection_completed",
        title: "Begehung abgeschlossen",
        message: `Die Begehung für ${inspection.company.name} wurde abgeschlossen.`,
        referenceType: "inspection",
        referenceId: inspection.id,
      }).catch(console.error);
    }

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Begehung" },
      { status: 500 }
    );
  }
}

// DELETE /api/inspections/[id] - Delete draft inspection
export async function DELETE(
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
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    if (inspection.status !== "DRAFT" && inspection.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Nur Entwürfe und laufende Begehungen können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, inspection.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Delete photo files from filesystem
    const photos = await prisma.inspectionPhoto.findMany({
      where: { inspectionId: params.id },
      select: { filePath: true },
    });
    for (const photo of photos) {
      const filePath = path.join(process.cwd(), photo.filePath);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
    // Try to remove directory
    const photoDir = path.join(process.cwd(), "uploads", "inspections", params.id);
    if (fs.existsSync(photoDir)) {
      try { fs.rmdirSync(photoDir); } catch { /* ignore */ }
    }

    await prisma.inspection.delete({ where: { id: params.id } });

    logAudit({ userId: session.user.id, action: "delete", entityType: "inspection", entityId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Begehung" },
      { status: 500 }
    );
  }
}
