import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET /api/companies/[id]/templates - Get all templates with preselection info
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
      select: { id: true, name: true, industryId: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    // Fetch all active template documents
    const templates = await prisma.document.findMany({
      where: { isTemplate: true, status: "active" },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true,
            fullName: true,
            parentGroup: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { title: "asc" },
      ],
    });

    // Get default category IDs based on industry
    let defaultCategoryIds: string[] = [];
    if (company.industryId) {
      const defaults = await prisma.industryDefaultCategory.findMany({
        where: { industryId: company.industryId },
        select: { categoryId: true },
      });
      defaultCategoryIds = defaults.map((d) => d.categoryId);
    }

    // Get already assigned document IDs
    const assigned = await prisma.companyDocument.findMany({
      where: { companyId: id },
      select: { documentId: true },
    });
    const assignedDocumentIds = assigned.map((a) => a.documentId);

    return NextResponse.json({
      templates: JSON.parse(JSON.stringify(templates)),
      defaultCategoryIds,
      assignedDocumentIds,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Vorlagen" },
      { status: 500 }
    );
  }
}

// POST /api/companies/[id]/templates - Bulk assign templates to company
export async function POST(
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
    const { documentIds } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "documentIds muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    // Fetch the template documents
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, isTemplate: true },
      select: { id: true, categoryId: true, version: true },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Vorlagen gefunden" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create CompanyDocument records
      for (const doc of documents) {
        await tx.companyDocument.upsert({
          where: {
            companyId_documentId: { companyId: id, documentId: doc.id },
          },
          update: {},
          create: {
            companyId: id,
            documentId: doc.id,
            syncedVersion: doc.version,
            isCurrent: true,
            assignedById: session.user.id,
          },
        });
      }

      // 2. Create CompanyCategory records for all involved categories
      const uniqueCategoryIds = Array.from(
        new Set(documents.map((d) => d.categoryId))
      );
      for (const categoryId of uniqueCategoryIds) {
        await tx.companyCategory.upsert({
          where: {
            companyId_categoryId: { companyId: id, categoryId },
          },
          update: {},
          create: {
            companyId: id,
            categoryId,
            isRelevant: true,
            determinedAt: new Date(),
            determinedById: session.user.id,
          },
        });
      }
    });

    logAudit({
      userId: session.user.id,
      action: "assign_templates",
      entityType: "company",
      entityId: id,
      details: {
        templateCount: documents.length,
        categoryCount: Array.from(new Set(documents.map((d) => d.categoryId))).length,
      },
    });

    return NextResponse.json({
      success: true,
      assigned: documents.length,
      categories: Array.from(new Set(documents.map((d) => d.categoryId))).length,
    });
  } catch (error) {
    console.error("Error assigning templates:", error);
    return NextResponse.json(
      { error: "Fehler beim Zuweisen der Vorlagen" },
      { status: 500 }
    );
  }
}
