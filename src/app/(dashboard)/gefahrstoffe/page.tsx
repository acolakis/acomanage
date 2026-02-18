import Link from "next/link";
import { Plus, FlaskConical, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const ghsLabels: Record<string, string> = {
  GHS01: "Explodierende Bombe",
  GHS02: "Flamme",
  GHS03: "Flamme über Kreis",
  GHS04: "Gasflasche",
  GHS05: "Ätzwirkung",
  GHS06: "Totenkopf",
  GHS07: "Ausrufezeichen",
  GHS08: "Gesundheitsgefahr",
  GHS09: "Umwelt",
};

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gefahrstoffkataster
          </h1>
          <p className="text-muted-foreground">
            {substances.length} Gefahrstoffe in {companies.filter((c) => c._count.hazardousSubstances > 0).length} Betrieben
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
              <p className="text-2xl font-bold">
                {companies.filter((c) => c._count.hazardousSubstances > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">Betriebe mit Gefahrstoffen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Substances grouped by company */}
      {companies
        .filter((c) => c._count.hazardousSubstances > 0)
        .map((company) => {
          const companySubstances = substances.filter(
            (s) => s.companyId === company.id
          );
          return (
            <Card key={company.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {company.name}
                </CardTitle>
                <CardDescription>
                  {companySubstances.length} Gefahrstoffe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-medium">Nr.</th>
                        <th className="pb-2 pr-4 font-medium">Handelsname</th>
                        <th className="pb-2 pr-4 font-medium">Hersteller</th>
                        <th className="pb-2 pr-4 font-medium">CAS-Nr.</th>
                        <th className="pb-2 pr-4 font-medium">GHS</th>
                        <th className="pb-2 pr-4 font-medium">Signalwort</th>
                        <th className="pb-2 pr-4 font-medium">Einsatzort</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companySubstances.map((substance) => (
                        <tr
                          key={substance.id}
                          className="border-b last:border-0 hover:bg-accent/50"
                        >
                          <td className="py-2 pr-4 text-muted-foreground">
                            {substance.lfdNr}
                          </td>
                          <td className="py-2 pr-4">
                            <Link
                              href={`/gefahrstoffe/${substance.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {substance.tradeName}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {substance.manufacturer || "—"}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">
                            {substance.casNumber || "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-1 flex-wrap">
                              {substance.ghsPictograms.map((ghs) => (
                                <Badge
                                  key={ghs}
                                  variant="outline"
                                  className="text-xs"
                                  title={ghsLabels[ghs] || ghs}
                                >
                                  {ghs}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            {substance.signalWord ? (
                              <Badge
                                variant={
                                  substance.signalWord === "Gefahr"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {substance.signalWord}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {substance.usageLocation || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

      {substances.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Gefahrstoffe erfasst.
            </p>
            <Button asChild className="mt-4">
              <Link href="/gefahrstoffe/neu">Ersten Gefahrstoff erfassen</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
