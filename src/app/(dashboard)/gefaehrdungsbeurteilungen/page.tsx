import Link from "next/link";
import { Plus, ShieldAlert, Building2, AlertTriangle } from "lucide-react";
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

const typeLabels: Record<string, string> = {
  activity: "Tätigkeitsbezogen",
  workplace: "Arbeitsplatzbezogen",
  substance: "Gefahrstoffbezogen",
  machine: "Maschinenbezogen",
  psyche: "Psychische Belastungen",
};

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  review_needed: "Überprüfung nötig",
  archived: "Archiviert",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  review_needed: "destructive",
  archived: "outline",
};

async function getRiskAssessments() {
  try {
    return await prisma.riskAssessment.findMany({
      where: { status: { not: "archived" } },
      include: {
        company: { select: { id: true, name: true } },
        assessedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { hazards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function GefaehrdungsbeurteilungenPage() {
  const assessments = await getRiskAssessments();

  const openMeasures = await prisma.riskAssessmentHazard
    .count({
      where: {
        status: "open",
        assessment: { status: { not: "archived" } },
      },
    })
    .catch(() => 0);

  const highRisk = await prisma.riskAssessmentHazard
    .count({
      where: {
        riskLevel: { in: ["HOCH", "KRITISCH"] },
        status: "open",
        assessment: { status: { not: "archived" } },
      },
    })
    .catch(() => 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gefährdungsbeurteilungen
          </h1>
          <p className="text-muted-foreground">
            {assessments.length} Beurteilungen
          </p>
        </div>
        <Button asChild>
          <Link href="/gefaehrdungsbeurteilungen/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue GBU
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{assessments.length}</p>
              <p className="text-xs text-muted-foreground">GBU gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{highRisk}</p>
              <p className="text-xs text-muted-foreground">
                Hoch/Kritische Gefährdungen
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openMeasures}</p>
              <p className="text-xs text-muted-foreground">Offene Maßnahmen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment List */}
      <div className="space-y-3">
        {assessments.length > 0 ? (
          assessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/gefaehrdungsbeurteilungen/${assessment.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {assessment.title}
                      </CardTitle>
                      <CardDescription>
                        {assessment.company.name} &middot;{" "}
                        {typeLabels[assessment.assessmentType] ||
                          assessment.assessmentType}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[assessment.status]}>
                      {statusLabels[assessment.status] || assessment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {assessment.assessmentDate && (
                      <span>
                        {new Date(assessment.assessmentDate).toLocaleDateString(
                          "de-DE"
                        )}
                      </span>
                    )}
                    {assessment.assessedBy && (
                      <span>
                        {assessment.assessedBy.firstName}{" "}
                        {assessment.assessedBy.lastName}
                      </span>
                    )}
                    <span>
                      {assessment._count.hazards} Gefährdungen
                    </span>
                    {assessment.assessedArea && (
                      <span>{assessment.assessedArea}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Noch keine Gefährdungsbeurteilungen vorhanden.
              </p>
              <Button asChild className="mt-4">
                <Link href="/gefaehrdungsbeurteilungen/neu">
                  Erste GBU erstellen
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
