import Link from "next/link";
import { Plus, AlertTriangle, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { IncidentListFilter } from "@/components/incidents/incident-list-filter";

async function getIncidents() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.incident.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { photos: true, actions: true } },
      },
      orderBy: { incidentDate: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function VorfaellePage() {
  const incidents = await getIncidents();

  const companyFilter = getSelectedCompanyFilter();
  const openIncidents = await prisma.incident.count({
    where: {
      status: { in: ["GEMELDET", "IN_UNTERSUCHUNG", "MASSNAHMEN"] },
      ...companyFilter,
    },
  }).catch(() => 0);

  const serializedIncidents = JSON.parse(JSON.stringify(incidents));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vorfälle & Unfälle</h1>
          <p className="text-muted-foreground">
            {incidents.length} Vorfälle insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/vorfaelle/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Vorfall
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{incidents.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openIncidents}</p>
              <p className="text-xs text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Shield className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">
                {incidents.filter((i) => i.incidentType === "UNFALL").length}
              </p>
              <p className="text-xs text-muted-foreground">Unfälle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <IncidentListFilter incidents={serializedIncidents} />
    </div>
  );
}
