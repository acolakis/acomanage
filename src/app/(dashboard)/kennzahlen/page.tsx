import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter, getSelectedCompanyId } from "@/lib/company-filter";
import { KennzahlenDashboard } from "@/components/kpi/kennzahlen-dashboard";

async function getKpiData() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    const selectedCompanyId = getSelectedCompanyId();

    const definitions = await prisma.kpiDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const values = await prisma.kpiValue.findMany({
      where: { ...companyFilter },
      include: {
        kpi: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            targetDirection: true,
            isoClause: true,
          },
        },
        company: { select: { id: true, name: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    });

    // Get companies for the form dropdown
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        ...(selectedCompanyId ? { id: selectedCompanyId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { definitions, values, companies };
  } catch {
    return { definitions: [], values: [], companies: [] };
  }
}

export default async function KennzahlenPage() {
  const { definitions, values, companies } = await getKpiData();

  const serializedDefinitions = JSON.parse(JSON.stringify(definitions));
  const serializedValues = JSON.parse(JSON.stringify(values));
  const serializedCompanies = JSON.parse(JSON.stringify(companies));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kennzahlen</h1>
          <p className="text-muted-foreground">
            SGA-Leistungskennzahlen nach ISO 45001 Abschnitt 9.1
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          <span className="text-sm">{definitions.length} Kennzahlen definiert</span>
        </div>
      </div>

      <KennzahlenDashboard
        kpiDefinitions={serializedDefinitions}
        kpiValues={serializedValues}
        companies={serializedCompanies}
      />
    </div>
  );
}
