import { Suspense } from "react";
import {
  Building2,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Loader2,
  ListChecks,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyId } from "@/lib/company-filter";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { CompanyOverview } from "@/components/dashboard/company-overview";

async function getDashboardStats() {
  try {
    const selectedCompanyId = getSelectedCompanyId();
    const companyFilter = selectedCompanyId ? { companyId: selectedCompanyId } : {};

    const [
      companiesCount,
      openInspectionsCount,
      documentsCount,
      openFindingsCount,
      openIncidentsCount,
      overdueActionsCount,
    ] = await Promise.all([
      prisma.company.count({
        where: { isActive: true, ...(selectedCompanyId ? { id: selectedCompanyId } : {}) },
      }),
      prisma.inspection.count({
        where: { status: { in: ["DRAFT", "IN_PROGRESS"] }, ...companyFilter },
      }),
      selectedCompanyId
        ? prisma.companyDocument.count({ where: { companyId: selectedCompanyId } })
        : prisma.document.count({ where: { status: "active" } }),
      prisma.inspectionFinding.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
          ...(selectedCompanyId ? { inspection: { companyId: selectedCompanyId } } : {}),
        },
      }),
      prisma.incident.count({
        where: {
          status: { in: ["GEMELDET", "IN_UNTERSUCHUNG", "MASSNAHMEN"] },
          ...companyFilter,
        },
      }),
      prisma.correctiveAction.count({
        where: {
          status: { in: ["OFFEN", "IN_BEARBEITUNG"] },
          deadline: { lt: new Date() },
          ...companyFilter,
        },
      }),
    ]);

    return {
      companiesCount,
      openInspectionsCount,
      documentsCount,
      openFindingsCount,
      openIncidentsCount,
      overdueActionsCount,
    };
  } catch {
    return {
      companiesCount: 0,
      openInspectionsCount: 0,
      documentsCount: 0,
      openFindingsCount: 0,
      openIncidentsCount: 0,
      overdueActionsCount: 0,
    };
  }
}

function DashboardCardSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Wird geladen...
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    {
      title: "Betriebe",
      value: stats.companiesCount,
      description: "Aktive Betriebe",
      icon: Building2,
    },
    {
      title: "Offene Begehungen",
      value: stats.openInspectionsCount,
      description: "Entwurf / In Bearbeitung",
      icon: ClipboardCheck,
    },
    {
      title: "Dokumente",
      value: stats.documentsCount,
      description: "Aktive Dokumente",
      icon: FileText,
    },
    {
      title: "Offene Befunde",
      value: stats.openFindingsCount,
      description: "Aus Begehungen",
      icon: AlertTriangle,
    },
    {
      title: "Offene Vorfälle",
      value: stats.openIncidentsCount,
      description: "Gemeldet / In Untersuchung",
      icon: Shield,
    },
    {
      title: "Überfällige Maßnahmen",
      value: stats.overdueActionsCount,
      description: "Frist überschritten",
      icon: ListChecks,
      highlight: stats.overdueActionsCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Willkommen bei AcoManage
        </h1>
        <p className="text-muted-foreground">
          Übersicht über Ihre Arbeitsschutzdaten
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className={"highlight" in card && card.highlight ? "border-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${"highlight" in card && card.highlight ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${"highlight" in card && card.highlight ? "text-destructive" : ""}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<DashboardCardSkeleton title="Letzte Aktivitäten" />}>
          <RecentActivity />
        </Suspense>
        <Suspense fallback={<DashboardCardSkeleton title="Anstehende Fristen" />}>
          <UpcomingDeadlines />
        </Suspense>
      </div>

      <Suspense fallback={<DashboardCardSkeleton title="Betriebsübersicht" />}>
        <CompanyOverview />
      </Suspense>
    </div>
  );
}
