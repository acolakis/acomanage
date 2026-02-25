import { ListChecks, Clock, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { ActionListFilter } from "@/components/corrective-actions/action-list-filter";

async function getActions() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.correctiveAction.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        incident: { select: { id: true, incidentNumber: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function MassnahmenPage() {
  const actions = await getActions();

  // Stats
  const openCount = actions.filter((a) =>
    ["OFFEN", "IN_BEARBEITUNG"].includes(a.status)
  ).length;
  const overdueCount = actions.filter((a) => {
    if (!a.deadline || a.status === "ABGESCHLOSSEN") return false;
    return new Date(a.deadline) < new Date();
  }).length;

  const serializedActions = JSON.parse(JSON.stringify(actions));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Massnahmen</h1>
        <p className="text-muted-foreground">
          {actions.length} Massnahmen insgesamt
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{actions.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">
                Offen / In Bearbeitung
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">
                Uberfällig
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActionListFilter actions={serializedActions} />
    </div>
  );
}
