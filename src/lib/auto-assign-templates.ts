import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * Automatically assigns industry-default document templates to a newly created company.
 * Creates CompanyDocument and CompanyCategory records based on the industry's default categories.
 */
export async function autoAssignTemplates(
  companyId: string,
  industryId: string,
  userId: string
): Promise<void> {
  // 1. Get default categories for this industry
  const defaultCategories = await prisma.industryDefaultCategory.findMany({
    where: { industryId },
    select: { categoryId: true },
  });

  if (defaultCategories.length === 0) return;

  const categoryIds = defaultCategories.map((dc) => dc.categoryId);

  // 2. Find all active template documents in these categories
  const documents = await prisma.document.findMany({
    where: {
      isTemplate: true,
      status: "active",
      categoryId: { in: categoryIds },
    },
    select: { id: true, categoryId: true, version: true },
  });

  if (documents.length === 0) return;

  // 3. Assign documents and categories in a transaction
  await prisma.$transaction(async (tx) => {
    for (const doc of documents) {
      await tx.companyDocument.upsert({
        where: {
          companyId_documentId: { companyId, documentId: doc.id },
        },
        update: {},
        create: {
          companyId,
          documentId: doc.id,
          syncedVersion: doc.version,
          isCurrent: true,
          assignedById: userId,
        },
      });
    }

    const uniqueCategoryIds = Array.from(
      new Set(documents.map((d) => d.categoryId))
    );
    for (const categoryId of uniqueCategoryIds) {
      await tx.companyCategory.upsert({
        where: {
          companyId_categoryId: { companyId, categoryId },
        },
        update: {},
        create: {
          companyId,
          categoryId,
          isRelevant: true,
          determinedAt: new Date(),
          determinedById: userId,
        },
      });
    }
  });

  logAudit({
    userId,
    action: "auto_assign_templates",
    entityType: "company",
    entityId: companyId,
    details: {
      templateCount: documents.length,
      categoryCount: Array.from(new Set(documents.map((d) => d.categoryId))).length,
    },
  });
}
