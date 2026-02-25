import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { logAudit } from "@/lib/audit";

// GET /api/companies/[id]/context - Get company context
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!hasCompanyAccess(session, id)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const context = await prisma.companyContext.findUnique({
      where: { companyId: id },
    });

    if (!context) {
      // Return empty default structure - context simply doesn't exist yet
      return NextResponse.json({
        companyId: id,
        internalIssues: null,
        externalIssues: null,
        interestedParties: null,
        sgaScope: null,
        scopeInclusions: null,
        scopeExclusions: null,
        ohsPolicy: null,
        ohsPolicyDate: null,
        ohsPolicyApprovedBy: null,
        ohsPolicyDocPath: null,
        ohsRoles: null,
        participationMechanism: null,
        version: 1,
        lastReviewDate: null,
        nextReviewDate: null,
      });
    }

    return NextResponse.json(JSON.parse(JSON.stringify(context)));
  } catch (error) {
    console.error("Error fetching company context:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Unternehmenskontexts" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id]/context - Create or update company context
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!hasCompanyAccess(session, id)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build data object from allowed fields
    const data: Record<string, unknown> = {};

    const stringFields = [
      "internalIssues",
      "externalIssues",
      "sgaScope",
      "scopeInclusions",
      "scopeExclusions",
      "ohsPolicy",
      "ohsPolicyApprovedBy",
      "participationMechanism",
    ] as const;

    for (const field of stringFields) {
      if (field in body) {
        data[field] = body[field] || null;
      }
    }

    // JSON fields - sanitize with JSON.parse(JSON.stringify())
    if ("interestedParties" in body) {
      data.interestedParties = body.interestedParties
        ? JSON.parse(JSON.stringify(body.interestedParties))
        : null;
    }

    if ("ohsRoles" in body) {
      data.ohsRoles = body.ohsRoles
        ? JSON.parse(JSON.stringify(body.ohsRoles))
        : null;
    }

    // Date fields
    if ("ohsPolicyDate" in body) {
      data.ohsPolicyDate = body.ohsPolicyDate
        ? new Date(body.ohsPolicyDate)
        : null;
    }

    if ("lastReviewDate" in body) {
      data.lastReviewDate = body.lastReviewDate
        ? new Date(body.lastReviewDate)
        : null;
    }

    if ("nextReviewDate" in body) {
      data.nextReviewDate = body.nextReviewDate
        ? new Date(body.nextReviewDate)
        : null;
    }

    // Check if context already exists to determine create vs update for audit
    const existing = await prisma.companyContext.findUnique({
      where: { companyId: id },
      select: { id: true, version: true },
    });

    const context = await prisma.companyContext.upsert({
      where: { companyId: id },
      create: {
        companyId: id,
        ...data,
      },
      update: {
        ...data,
        version: existing ? existing.version + 1 : 1,
      },
    });

    logAudit({
      userId: session.user.id,
      action: existing ? "update" : "create",
      entityType: "companyContext",
      entityId: context.id,
      details: { companyId: id, companyName: company.name },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(context)));
  } catch (error) {
    console.error("Error saving company context:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern des Unternehmenskontexts" },
      { status: 500 }
    );
  }
}
