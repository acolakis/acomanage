import {
  Building2,
  ClipboardCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

async function getDashboardStats() {
  try {
    const [
      companiesCount,
      openInspectionsCount,
      documentsCount,
      openMeasuresCount,
    ] = await Promise.all([
      prisma.company.count({ where: { isActive: true } }),
      prisma.inspection.count({
        where: { status: { in: ["DRAFT", "IN_PROGRESS"] } },
      }),
      prisma.document.count({ where: { status: "active" } }),
      prisma.inspectionFinding.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] } },
      }),
    ]);

    return {
      companiesCount,
      openInspectionsCount,
      documentsCount,
      openMeasuresCount,
    };
  } catch {
    return {
      companiesCount: 0,
      openInspectionsCount: 0,
      documentsCount: 0,
      openMeasuresCount: 0,
    };
  }
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
      title: "Offene Maßnahmen",
      value: stats.openMeasuresCount,
      description: "Offen / In Bearbeitung / Überfällig",
      icon: AlertTriangle,
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
