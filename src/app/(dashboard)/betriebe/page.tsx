import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { CompanyTable } from "@/components/companies/company-table";

async function getCompanies() {
  try {
    const selectedCompanyId = getSelectedCompanyId();
    const companies = await prisma.company.findMany({
      where: selectedCompanyId ? { id: selectedCompanyId } : undefined,
      include: {
        industry: true,
        _count: {
          select: {
            documents: true,
            inspections: true,
            hazardousSubstances: true,
            machines: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return companies;
  } catch {
    return [];
  }
}

async function getIndustries() {
  try {
    const industries = await prisma.industry.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return industries;
  } catch {
    return [];
  }
}

export default async function BetriebePage() {
  const [companies, industries] = await Promise.all([
    getCompanies(),
    getIndustries(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Betriebe</h1>
          <p className="text-muted-foreground">
            {companies.length} {companies.length === 1 ? "Betrieb" : "Betriebe"} insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/betriebe/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Betrieb
          </Link>
        </Button>
      </div>

      <CompanyTable
        data={JSON.parse(JSON.stringify(companies))}
        industries={JSON.parse(JSON.stringify(industries))}
      />
    </div>
  );
}
