import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Building2, ClipboardCheck, FileText, Cog, Shield, FlaskConical } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: string;
  label: string;
  detail: string;
  date: Date;
  href: string;
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  const selectedCompanyId = getSelectedCompanyId();
  const companyFilter = selectedCompanyId ? { companyId: selectedCompanyId } : {};

  // Query the 5 most recent from each entity type
  const [inspections, companies, substances, machines, assessments] = await Promise.all([
    prisma.inspection.findMany({
      where: { ...companyFilter },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }),
    prisma.company.findMany({
      where: { isActive: true, ...(selectedCompanyId ? { id: selectedCompanyId } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.hazardousSubstance.findMany({
      where: { status: { not: "archived" }, ...companyFilter },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }),
    prisma.machine.findMany({
      where: { status: { not: "archived" }, ...companyFilter },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }),
    prisma.riskAssessment.findMany({
      where: { status: { not: "archived" }, ...companyFilter },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }),
  ]);

  const items: ActivityItem[] = [
    ...inspections.map((i) => ({
      id: i.id,
      type: "inspection",
      label: `Begehung ${i.inspectionNumber || ""}`,
      detail: i.company.name,
      date: i.updatedAt,
      href: `/begehungen/${i.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company",
      label: c.name,
      detail: "Betrieb",
      date: c.updatedAt,
      href: `/betriebe/${c.id}`,
    })),
    ...substances.map((s) => ({
      id: s.id,
      type: "substance",
      label: s.tradeName,
      detail: s.company.name,
      date: s.updatedAt,
      href: `/gefahrstoffe/${s.id}`,
    })),
    ...machines.map((m) => ({
      id: m.id,
      type: "machine",
      label: m.name,
      detail: m.company.name,
      date: m.updatedAt,
      href: `/maschinen/${m.id}`,
    })),
    ...assessments.map((a) => ({
      id: a.id,
      type: "assessment",
      label: a.title,
      detail: a.company.name,
      date: a.updatedAt,
      href: `/gefaehrdungsbeurteilungen/${a.id}`,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
}

const typeIcons: Record<string, typeof Activity> = {
  inspection: ClipboardCheck,
  company: Building2,
  substance: FlaskConical,
  machine: Cog,
  assessment: Shield,
};

const typeLabels: Record<string, string> = {
  inspection: "Begehung",
  company: "Betrieb",
  substance: "Gefahrstoff",
  machine: "Maschine",
  assessment: "GBU",
};

export async function RecentActivity() {
  const activities = await getRecentActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Letzte Aktivitäten
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Aktivitäten vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[item.type]}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.date.toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
