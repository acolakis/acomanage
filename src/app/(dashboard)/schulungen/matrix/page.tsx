import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { CompetenceMatrix } from "@/components/trainings/competence-matrix";

async function getRequirements() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.competenceRequirement.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ role: "asc" }, { qualification: "asc" }],
    });
  } catch {
    return [];
  }
}

async function getCompanies() {
  try {
    const companyFilter = getSelectedCompanyFilter("id");
    return await prisma.company.findMany({
      where: { isActive: true, ...companyFilter },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function SchulungenMatrixPage() {
  const [requirements, companies] = await Promise.all([
    getRequirements(),
    getCompanies(),
  ]);

  const serializedRequirements = JSON.parse(JSON.stringify(requirements));
  const serializedCompanies = JSON.parse(JSON.stringify(companies));

  return (
    <CompetenceMatrix
      requirements={serializedRequirements}
      companies={serializedCompanies}
    />
  );
}
