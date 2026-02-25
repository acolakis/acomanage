import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyContextWizard } from "@/components/companies/company-context-wizard";

export default async function KontextPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, city: true },
  });

  if (!company) return notFound();

  const context = await prisma.companyContext.findUnique({
    where: { companyId: params.id },
  });

  return (
    <CompanyContextWizard
      company={JSON.parse(JSON.stringify(company))}
      context={context ? JSON.parse(JSON.stringify(context)) : null}
    />
  );
}
