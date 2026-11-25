import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { DokumentePageContent } from "@/components/documents/dokumente-page-content";

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

async function getDigitalDocuments() {
  try {
    const selectedCompanyId = getSelectedCompanyId();
    const documents = await prisma.digitalDocument.findMany({
      where: {
        status: { not: "archived" },
        ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return documents;
  } catch {
    return [];
  }
}

export default async function DokumentePage() {
  const [documents, categories, digitalDocuments] = await Promise.all([
    getDocuments(),
    getCategories(),
    getDigitalDocuments(),
  ]);

  return (
    <DokumentePageContent
      documents={JSON.parse(JSON.stringify(documents))}
      categories={JSON.parse(JSON.stringify(categories))}
      digitalDocuments={JSON.parse(JSON.stringify(digitalDocuments))}
    />
  );
}
