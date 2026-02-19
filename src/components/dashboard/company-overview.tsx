import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import Link from "next/link";

interface CompanyStats {
  id: string;
  name: string;
  inspectionCount: number;
  substanceCount: number;
  machineCount: number;
  openMeasureCount: number;
}

async function getCompanyStats(): Promise<CompanyStats[]> {
  const selectedCompanyId = getSelectedCompanyId();
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      ...(selectedCompanyId ? { id: selectedCompanyId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          inspections: true,
          hazardousSubstances: true,
          machines: true,
        },
      },
    },
  });

  // Count open measures per company
  const openMeasures = await prisma.inspectionFinding.groupBy({
    by: ["inspectionId"],
    where: { status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] } },
    _count: true,
  });

  // Get inspection -> company mapping for the findings
  const inspectionIds = openMeasures.map((m) => m.inspectionId);
  const inspections = inspectionIds.length > 0
    ? await prisma.inspection.findMany({
        where: { id: { in: inspectionIds } },
        select: { id: true, companyId: true },
      })
    : [];

  const inspectionCompanyMap = new Map(inspections.map((i) => [i.id, i.companyId]));
  const companyMeasureCounts = new Map<string, number>();
  for (const m of openMeasures) {
    const companyId = inspectionCompanyMap.get(m.inspectionId);
    if (companyId) {
      companyMeasureCounts.set(companyId, (companyMeasureCounts.get(companyId) || 0) + m._count);
    }
  }

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    inspectionCount: c._count.inspections,
    substanceCount: c._count.hazardousSubstances,
    machineCount: c._count.machines,
    openMeasureCount: companyMeasureCounts.get(c.id) || 0,
  }));
}

export async function CompanyOverview() {
  const stats = await getCompanyStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Betriebsübersicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Betriebe vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Betrieb</th>
                  <th className="text-center py-2 font-medium">Begehungen</th>
                  <th className="text-center py-2 font-medium">Gefahrstoffe</th>
                  <th className="text-center py-2 font-medium">Maschinen</th>
                  <th className="text-center py-2 font-medium">Offene Maßnahmen</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2">
                      <Link href={`/betriebe/${c.id}`} className="text-primary hover:underline font-medium">
                        {c.name}
                      </Link>
                    </td>
                    <td className="text-center py-2">{c.inspectionCount}</td>
                    <td className="text-center py-2">{c.substanceCount}</td>
                    <td className="text-center py-2">{c.machineCount}</td>
                    <td className="text-center py-2">
                      {c.openMeasureCount > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {c.openMeasureCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
