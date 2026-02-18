import Link from "next/link";
import { Plus, FlaskConical, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubstanceListFilter } from "@/components/substances/substance-list-filter";

async function getSubstances() {
  try {
    return await prisma.hazardousSubstance.findMany({
      where: { status: "active" },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ companyId: "asc" }, { lfdNr: "asc" }],
    });
  } catch {
    return [];
  }
}

async function getCompanies() {
  try {
    return await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, _count: { select: { hazardousSubstances: true } } },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function GefahrstoffePage() {
  const [substances, companies] = await Promise.all([
    getSubstances(),
    getCompanies(),
  ]);

  const withSignalWord = substances.filter(
    (s) => s.signalWord === "Gefahr"
  ).length;

  const companiesWithSubstances = companies.filter(
    (c) => c._count.hazardousSubstances > 0
  );

  const serializedSubstances = JSON.parse(JSON.stringify(substances));
  const serializedCompanies = companiesWithSubstances.map((c) => ({
    id: c.id,
    name: c.name,
    count: c._count.hazardousSubstances,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gefahrstoffkataster
          </h1>
          <p className="text-muted-foreground">
            {substances.length} Gefahrstoffe in {companiesWithSubstances.length} Betrieben
          </p>
        </div>
        <Button asChild>
          <Link href="/gefahrstoffe/neu">
            <Plus className="mr-2 h-4 w-4" />
            Gefahrstoff erfassen
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{substances.length}</p>
              <p className="text-xs text-muted-foreground">Gefahrstoffe gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{withSignalWord}</p>
              <p className="text-xs text-muted-foreground">Signalwort &quot;Gefahr&quot;</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{companiesWithSubstances.length}</p>
              <p className="text-xs text-muted-foreground">Betriebe mit Gefahrstoffen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SubstanceListFilter
        substances={serializedSubstances}
        companies={serializedCompanies}
      />
    </div>
  );
}
