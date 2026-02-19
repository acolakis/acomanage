import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocumentDetail } from "@/components/documents/document-detail";

async function getDocument(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      companyDocuments: {
        include: {
          company: {
            select: { id: true, name: true, isActive: true },
          },
          assignedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      propagations: {
        orderBy: { propagatedAt: "desc" },
        take: 20,
        include: {
          propagatedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      gbaSubstances: {
        where: { status: "active" },
        select: {
          id: true,
          tradeName: true,
          company: { select: { id: true, name: true } },
        },
      },
      baMachines: {
        where: { status: { not: "archived" } },
        select: {
          id: true,
          name: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });
  return document;
}

async function getCompanies() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return companies;
}

export default async function DokumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [document, companies] = await Promise.all([
    getDocument(params.id),
    getCompanies(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <DocumentDetail
      document={JSON.parse(JSON.stringify(document))}
      allCompanies={JSON.parse(JSON.stringify(companies))}
    />
  );
}
