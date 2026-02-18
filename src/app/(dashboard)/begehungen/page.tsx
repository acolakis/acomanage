import Link from "next/link";
import { Plus, ClipboardCheck, Calendar, AlertTriangle } from "lucide-react";
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

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  IN_PROGRESS: "In Bearbeitung",
  COMPLETED: "Abgeschlossen",
  SENT: "Versendet",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  SENT: "outline",
};

const typeLabels: Record<string, string> = {
  INITIAL: "Erstbegehung",
  REGULAR: "Regelbegehung",
  FOLLOWUP: "Nachkontrolle",
  SPECIAL: "Sonderbegehung",
};

async function getInspections() {
  try {
    return await prisma.inspection.findMany({
      include: {
        company: { select: { id: true, name: true, city: true } },
        inspector: { select: { firstName: true, lastName: true } },
        _count: { select: { findings: true, photos: true } },
      },
      orderBy: { inspectionDate: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function BegehungenPage() {
  const inspections = await getInspections();

  // Stats
  const openFindings = await prisma.inspectionFinding.count({
    where: { status: { in: ["OPEN", "OVERDUE"] } },
  }).catch(() => 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Begehungen</h1>
          <p className="text-muted-foreground">
            {inspections.length} Begehungen insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/begehungen/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue Begehung
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{inspections.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {inspections.filter((i) => i.status === "DRAFT" || i.status === "IN_PROGRESS").length}
              </p>
              <p className="text-xs text-muted-foreground">In Bearbeitung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openFindings}</p>
              <p className="text-xs text-muted-foreground">Offene Befunde</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection List */}
      <div className="space-y-3">
        {inspections.length > 0 ? (
          inspections.map((inspection) => (
            <Link
              key={inspection.id}
              href={`/begehungen/${inspection.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {inspection.company.name}
                        {inspection.company.city &&
                          ` (${inspection.company.city})`}
                      </CardTitle>
                      <CardDescription>
                        {inspection.inspectionNumber} &middot;{" "}
                        {typeLabels[inspection.inspectionType]}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[inspection.status]}>
                      {statusLabels[inspection.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      {new Date(inspection.inspectionDate).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}
                    </span>
                    <span>
                      {inspection.inspector.firstName}{" "}
                      {inspection.inspector.lastName}
                    </span>
                    <span>{inspection._count.findings} Befunde</span>
                    <span>{inspection._count.photos} Fotos</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Noch keine Begehungen vorhanden.
              </p>
              <Button asChild className="mt-4">
                <Link href="/begehungen/neu">Erste Begehung starten</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
