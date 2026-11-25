import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";
import { DIGITAL_CATEGORIES } from "@/types/digital-documents";

// GET /api/digital-documents
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const categoryCode = searchParams.get("categoryCode");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
    status: status || { not: "archived" },
  };
  if (companyId) where.companyId = companyId;
  if (categoryCode) where.categoryCode = categoryCode;

  const pagination = parsePaginationParams(searchParams);

  try {
    const documents = await prisma.digitalDocument.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.digitalDocument.count({ where });
      return NextResponse.json(paginatedResponse(documents, total, pagination));
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Fehler beim Laden der digitalen Dokumente:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Dokumente" },
      { status: 500 }
    );
  }
}

// POST /api/digital-documents
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyId, categoryCode, title, formData, validFrom, validUntil } = body;

    if (!companyId || !categoryCode || !title || !formData) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen: companyId, categoryCode, title, formData" },
        { status: 400 }
      );
    }

    if (!DIGITAL_CATEGORIES.includes(categoryCode)) {
      return NextResponse.json(
        { error: `Ungültiger Kategorie-Code: ${categoryCode}` },
        { status: 400 }
      );
    }

    const document = await prisma.digitalDocument.create({
      data: {
        categoryCode,
        companyId,
        title,
        formData: JSON.parse(JSON.stringify(formData)),
        status: "active",
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "digital_document.create",
      entityType: "DigitalDocument",
      entityId: document.id,
      details: { categoryCode, companyId, title },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen des digitalen Dokuments:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Dokuments" },
      { status: 500 }
    );
  }
}
