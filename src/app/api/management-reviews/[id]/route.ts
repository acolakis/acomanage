import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/management-reviews/[id] - Get single review with all details
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const review = await prisma.managementReview.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Managementbewertung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, review.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error fetching management review:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Managementbewertung" },
      { status: 500 }
    );
  }
}

// PUT /api/management-reviews/[id] - Update review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.managementReview.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Managementbewertung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Inputs
    if (body.statusPreviousActions !== undefined)
      updateData.statusPreviousActions = body.statusPreviousActions;
    if (body.changesInternalExternal !== undefined)
      updateData.changesInternalExternal = body.changesInternalExternal;
    if (body.ohsPerformance !== undefined)
      updateData.ohsPerformance = body.ohsPerformance
        ? JSON.parse(JSON.stringify(body.ohsPerformance))
        : null;
    if (body.incidentSummary !== undefined)
      updateData.incidentSummary = body.incidentSummary;
    if (body.auditResults !== undefined)
      updateData.auditResults = body.auditResults;
    if (body.consultationResults !== undefined)
      updateData.consultationResults = body.consultationResults;
    if (body.risksOpportunities !== undefined)
      updateData.risksOpportunities = body.risksOpportunities;
    if (body.objectiveProgress !== undefined)
      updateData.objectiveProgress = body.objectiveProgress;

    // Outputs
    if (body.ohsFitness !== undefined) updateData.ohsFitness = body.ohsFitness;
    if (body.improvementNeeds !== undefined)
      updateData.improvementNeeds = body.improvementNeeds;
    if (body.resourceNeeds !== undefined)
      updateData.resourceNeeds = body.resourceNeeds;
    if (body.decisions !== undefined) updateData.decisions = body.decisions;

    // Meta
    if (body.attendees !== undefined) updateData.attendees = body.attendees;
    if (body.reviewDate !== undefined)
      updateData.reviewDate = new Date(body.reviewDate);

    // Approval
    if (body.approved === true && !existing.approvedAt) {
      updateData.approvedById = session.user.id;
      updateData.approvedAt = new Date();
    }

    const review = await prisma.managementReview.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "management_review",
      entityId: params.id,
      details: { approved: body.approved || false },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error updating management review:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Managementbewertung" },
      { status: 500 }
    );
  }
}

// DELETE /api/management-reviews/[id] - Delete review (only if not approved)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const review = await prisma.managementReview.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Managementbewertung nicht gefunden" },
        { status: 404 }
      );
    }

    if (review.approvedAt) {
      return NextResponse.json(
        { error: "Genehmigte Bewertungen können nicht gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, review.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.managementReview.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "management_review",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting management review:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Managementbewertung" },
      { status: 500 }
    );
  }
}
