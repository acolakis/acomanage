import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/companies - List all companies with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const industryId = searchParams.get("industryId");

    const where: Record<string, unknown> = {};

    // CLIENT users can only see their assigned companies
    if (session.user.role === "CLIENT") {
      where.id = { in: session.user.companyIds };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { companyNumber: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (industryId) {
      where.industryId = industryId;
    }

    const pagination = parsePaginationParams(searchParams);

    const companies = await prisma.company.findMany({
      where,
      include: {
        industry: true,
      },
      orderBy: {
        name: "asc",
      },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.company.count({ where });
      return NextResponse.json(paginatedResponse(companies, total, pagination));
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Unternehmen" },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name: body.name.trim(),
        companyNumber: body.companyNumber ?? null,
        legalForm: body.legalForm ?? null,
        industryId: body.industryId ?? null,
        street: body.street ?? null,
        zip: body.zip ?? null,
        city: body.city ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        website: body.website ?? null,
        contactName: body.contactName ?? null,
        contactPhone: body.contactPhone ?? null,
        contactEmail: body.contactEmail ?? null,
        employeeCount: body.employeeCount ?? null,
        berufsgenossenschaft: body.berufsgenossenschaft ?? null,
        bgMemberNumber: body.bgMemberNumber ?? null,
        notes: body.notes ?? null,
        contractStart: body.contractStart ? new Date(body.contractStart) : null,
        contractEnd: body.contractEnd ? new Date(body.contractEnd) : null,
        createdById: session.user.id,
      },
      include: {
        industry: true,
      },
    });

    logAudit({ userId: session.user.id, action: "create", entityType: "company", entityId: company.id, details: { name: company.name } });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Unternehmens" },
      { status: 500 }
    );
  }
}
