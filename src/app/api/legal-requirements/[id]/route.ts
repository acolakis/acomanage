import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/legal-requirements/[id] - Get single legal requirement
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const requirement = await prisma.legalRequirement.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: "Rechtsanforderung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, requirement.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error fetching legal requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Rechtsanforderung" },
      { status: 500 }
    );
  }
}

// PUT /api/legal-requirements/[id] - Update legal requirement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.legalRequirement.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Rechtsanforderung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.shortTitle !== undefined) updateData.shortTitle = body.shortTitle || null;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.section !== undefined) updateData.section = body.section || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.relevance !== undefined) updateData.relevance = body.relevance || null;
    if (body.complianceStatus !== undefined) updateData.complianceStatus = body.complianceStatus;
    if (body.complianceNotes !== undefined) updateData.complianceNotes = body.complianceNotes || null;
    if (body.lastReviewDate !== undefined) updateData.lastReviewDate = body.lastReviewDate ? new Date(body.lastReviewDate) : null;
    if (body.nextReviewDate !== undefined) updateData.nextReviewDate = body.nextReviewDate ? new Date(body.nextReviewDate) : null;
    if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl || null;

    const requirement = await prisma.legalRequirement.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "legal_requirement",
      entityId: params.id,
      details: { fields: Object.keys(updateData) },
    });

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error updating legal requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Rechtsanforderung" },
      { status: 500 }
    );
  }
}

// DELETE /api/legal-requirements/[id] - Soft delete legal requirement
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.legalRequirement.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Rechtsanforderung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.legalRequirement.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "legal_requirement",
      entityId: params.id,
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting legal requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Rechtsanforderung" },
      { status: 500 }
    );
  }
}
