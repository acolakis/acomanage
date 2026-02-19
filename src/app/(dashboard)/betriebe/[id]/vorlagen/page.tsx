import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { TemplateSelection } from "@/components/companies/template-selection";

export default async function VorlagenPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { industry: true },
  });

  if (!company) {
    notFound();
  }

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
    orderBy: [{ category: { sortOrder: "asc" } }, { title: "asc" }],
  });

  let defaultCategoryIds: string[] = [];
  if (company.industryId) {
    const defaults = await prisma.industryDefaultCategory.findMany({
      where: { industryId: company.industryId },
      select: { categoryId: true },
    });
    defaultCategoryIds = defaults.map((d) => d.categoryId);
  }

  const existingAssignments = await prisma.companyDocument.findMany({
    where: { companyId: params.id },
    select: { documentId: true },
  });
  const existingDocumentIds = existingAssignments.map((a) => a.documentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/betriebe/${company.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Betrieb
          </Link>
        </Button>
      </div>

      <TemplateSelection
        company={JSON.parse(
          JSON.stringify({
            id: company.id,
            name: company.name,
            industry: company.industry,
          })
        )}
        templates={JSON.parse(JSON.stringify(templates))}
        defaultCategoryIds={defaultCategoryIds}
        existingDocumentIds={existingDocumentIds}
      />
    </div>
  );
}
