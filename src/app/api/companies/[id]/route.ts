import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/companies/[id] - Get single company by id
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

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        industry: true,
        categories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, company.id)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Unternehmens" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update company fields
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
    const body = await request.json();

    // Check if company exists
    const existing = await prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    // Build update data from allowed fields
    const updateData: Record<string, unknown> = {};

    const stringFields = [
      "name",
      "companyNumber",
      "legalForm",
      "industryId",
      "street",
      "zip",
      "city",
      "phone",
      "email",
      "website",
      "contactName",
      "contactPhone",
      "contactEmail",
      "berufsgenossenschaft",
      "bgMemberNumber",
      "notes",
    ] as const;

    for (const field of stringFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if ("employeeCount" in body) {
      updateData.employeeCount = body.employeeCount;
    }

    if ("isActive" in body) {
      updateData.isActive = body.isActive;
    }

    if ("contractStart" in body) {
      updateData.contractStart = body.contractStart
        ? new Date(body.contractStart)
        : null;
    }

    if ("contractEnd" in body) {
      updateData.contractEnd = body.contractEnd
        ? new Date(body.contractEnd)
        : null;
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        industry: true,
      },
    });

    logAudit({ userId: session.user.id, action: "update", entityType: "company", entityId: id, details: { name: company.name } });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Unternehmens" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Soft-delete (set isActive to false)
export async function DELETE(
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

    // Check if company exists
    const existing = await prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    const company = await prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    logAudit({ userId: session.user.id, action: "archive", entityType: "company", entityId: id, details: { name: existing.name } });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Unternehmens" },
      { status: 500 }
    );
  }
}
