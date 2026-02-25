import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const typeLabels: Record<string, string> = {
  UNFALL: "Unfall",
  BEINAHEUNFALL: "Beinaheunfall",
  VORFALL: "Vorfall",
  BERUFSKRANKHEIT: "Berufskrankheit",
  ERSTEHILFE: "Erste Hilfe",
};

const severityLabels: Record<string, string> = {
  GERING: "Gering",
  MITTEL: "Mittel",
  SCHWER: "Schwer",
  TOEDLICH: "T\u00f6dlich",
};

const severityColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GERING: "outline",
  MITTEL: "secondary",
  SCHWER: "default",
  TOEDLICH: "destructive",
};

const statusLabels: Record<string, string> = {
  GEMELDET: "Gemeldet",
  IN_UNTERSUCHUNG: "In Untersuchung",
  MASSNAHMEN: "Ma\u00dfnahmen",
  ABGESCHLOSSEN: "Abgeschlossen",
};

export default async function PortalVorfaellePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const incidents = await prisma.incident.findMany({
    where: {
      companyId: { in: companyIds },
    },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { incidentDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vorf\u00e4lle & Unf\u00e4lle</h1>
        <p className="text-muted-foreground">
          {incidents.length} Vorf\u00e4lle
        </p>
      </div>

      {incidents.length > 0 ? (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {incident.incidentNumber
                        ? `${incident.incidentNumber} - `
                        : ""}
                      {incident.company.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {incident.description.length > 120
                        ? incident.description.slice(0, 120) + "..."
                        : incident.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={severityColors[incident.severity]}>
                      {severityLabels[incident.severity] || incident.severity}
                    </Badge>
                    <Badge variant="secondary">
                      {statusLabels[incident.status] || incident.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>
                    {new Date(incident.incidentDate).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <Badge variant="outline">
                    {typeLabels[incident.incidentType] || incident.incidentType}
                  </Badge>
                  {incident.location && <span>{incident.location}</span>}
                  {incident.department && <span>{incident.department}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Vorf\u00e4lle erfasst.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
