import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/legal-requirements - List legal requirements
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const category = searchParams.get("category");
  const complianceStatus = searchParams.get("complianceStatus");
  const isActiveParam = searchParams.get("isActive");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
    isActive: isActiveParam === "false" ? false : true,
  };
  if (companyId) where.companyId = companyId;
  if (category) where.category = category;
  if (complianceStatus) where.complianceStatus = complianceStatus;

  const pagination = parsePaginationParams(searchParams);

  try {
    const requirements = await prisma.legalRequirement.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.legalRequirement.count({ where });
      return NextResponse.json(paginatedResponse(requirements, total, pagination));
    }

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("Error fetching legal requirements:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Rechtsanforderungen" },
      { status: 500 }
    );
  }
}

// POST /api/legal-requirements - Create legal requirement(s)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Bulk mode: create multiple requirements at once
    if (body.bulk === true) {
      const { companyId, requirements } = body;

      if (!companyId || !Array.isArray(requirements) || requirements.length === 0) {
        return NextResponse.json(
          { error: "Betrieb und Anforderungen sind erforderlich" },
          { status: 400 }
        );
      }

      const created = await prisma.legalRequirement.createMany({
        data: requirements.map((req: { title: string; category: string; shortTitle?: string; description?: string; relevance?: string }) => ({
          companyId,
          title: req.title,
          category: req.category,
          shortTitle: req.shortTitle || null,
          description: req.description || null,
          relevance: req.relevance || null,
          createdById: session.user.id,
        })),
      });

      logAudit({
        userId: session.user.id,
        action: "bulk_create",
        entityType: "legal_requirement",
        details: { companyId, count: created.count },
      });

      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    // Single creation
    const {
      companyId,
      title,
      category,
      shortTitle,
      section,
      description,
      relevance,
      complianceStatus,
      complianceNotes,
      lastReviewDate,
      nextReviewDate,
      sourceUrl,
    } = body;

    if (!companyId || !title || !category) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Kategorie sind erforderlich" },
        { status: 400 }
      );
    }

    const requirement = await prisma.legalRequirement.create({
      data: {
        companyId,
        title,
        category,
        shortTitle: shortTitle || null,
        section: section || null,
        description: description || null,
        relevance: relevance || null,
        complianceStatus: complianceStatus || "OFFEN",
        complianceNotes: complianceNotes || null,
        lastReviewDate: lastReviewDate ? new Date(lastReviewDate) : null,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        sourceUrl: sourceUrl || null,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "legal_requirement",
      entityId: requirement.id,
      details: { title, category },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("Error creating legal requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Rechtsanforderung" },
      { status: 500 }
    );
  }
}
