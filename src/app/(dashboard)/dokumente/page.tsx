import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { DocumentList } from "@/components/documents/document-list";

async function getDocuments() {
  try {
    const selectedCompanyId = getSelectedCompanyId();
    const documents = await prisma.document.findMany({
      where: {
        status: { not: "archived" },
        ...(selectedCompanyId
          ? { companyDocuments: { some: { companyId: selectedCompanyId } } }
          : {}),
      },
      include: {
        category: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { companyDocuments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return documents;
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    const categories = await prisma.documentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return categories;
  } catch {
    return [];
  }
}

export default async function DokumentePage() {
  const [documents, categories] = await Promise.all([
    getDocuments(),
    getCategories(),
  ]);

  return (
    <DocumentList
      data={JSON.parse(JSON.stringify(documents))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
