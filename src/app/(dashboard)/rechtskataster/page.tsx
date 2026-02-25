import Link from "next/link";
import { Plus, Scale, CheckCircle2, AlertTriangle, Import } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { LegalListFilter } from "@/components/legal/legal-list-filter";

async function getLegalRequirements() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.legalRequirement.findMany({
      where: { isActive: true, ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
  } catch {
    return [];
  }
}

export default async function RechtskatasterPage() {
  const requirements = await getLegalRequirements();

  const companyFilter = getSelectedCompanyFilter();

  const konformCount = await prisma.legalRequirement.count({
    where: { isActive: true, complianceStatus: "KONFORM", ...companyFilter },
  }).catch(() => 0);

  const nichtKonformCount = await prisma.legalRequirement.count({
    where: {
      isActive: true,
      complianceStatus: { in: ["NICHT_KONFORM", "TEILWEISE"] },
      ...companyFilter,
    },
  }).catch(() => 0);

  const serializedRequirements = JSON.parse(JSON.stringify(requirements));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rechtskataster</h1>
          <p className="text-muted-foreground">
            {requirements.length} Anforderungen insgesamt
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/rechtskataster/neu?mode=import">
              <Import className="mr-2 h-4 w-4" />
              Standardvorlagen importieren
            </Link>
          </Button>
          <Button asChild>
            <Link href="/rechtskataster/neu">
              <Plus className="mr-2 h-4 w-4" />
              Neue Anforderung
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Scale className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{requirements.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{konformCount}</p>
              <p className="text-xs text-muted-foreground">Konform</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{nichtKonformCount}</p>
              <p className="text-xs text-muted-foreground">Nicht konform / Teilweise</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <LegalListFilter requirements={serializedRequirements} />
    </div>
  );
}
