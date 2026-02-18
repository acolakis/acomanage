import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
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
};

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

const riskColors: Record<string, string> = {
  NIEDRIG: "bg-green-100 text-green-800",
  MITTEL: "bg-yellow-100 text-yellow-800",
  HOCH: "bg-orange-100 text-orange-800",
  KRITISCH: "bg-red-100 text-red-800",
};

const measureTypeLabels: Record<string, string> = {
  T: "Technisch",
  O: "Organisatorisch",
  P: "Persönlich",
};

function getRiskColor(p: number, s: number): string {
  const risk = p * s;
  if (risk >= 16) return "bg-red-500 text-white";
  if (risk >= 10) return "bg-orange-500 text-white";
  if (risk >= 5) return "bg-yellow-400 text-black";
  return "bg-green-500 text-white";
}

export default async function PortalGbuDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const assessment = await prisma.riskAssessment.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { name: true } },
      assessedBy: { select: { firstName: true, lastName: true } },
      hazards: {
        orderBy: { hazardNumber: "asc" },
      },
    },
  });

  if (!assessment || !companyIds.includes(assessment.companyId)) {
    notFound();
  }

  const highRiskCount = assessment.hazards.filter(
    (h) => h.riskLevel === "KRITISCH" || h.riskLevel === "HOCH"
  ).length;
  const openCount = assessment.hazards.filter(
    (h) => h.status === "open"
  ).length;
  const completedCount = assessment.hazards.filter(
    (h) => h.status === "completed"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/gefaehrdungsbeurteilungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {assessment.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{assessment.company.name}</span>
            <Badge variant="outline">
              {typeLabels[assessment.assessmentType] || assessment.assessmentType}
            </Badge>
            <Badge>{statusLabels[assessment.status] || assessment.status}</Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/risk-assessments/${assessment.id}/pdf`}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF herunterladen
          </a>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{assessment.hazards.length}</p>
            <p className="text-xs text-muted-foreground">Gefährdungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">{highRiskCount}</p>
            <p className="text-xs text-muted-foreground">Hoch/Kritisch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">{openCount}</p>
            <p className="text-xs text-muted-foreground">Offene Maßnahmen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Erledigt</p>
          </CardContent>
        </Card>
      </div>

      {/* Hazards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Gefährdungen ({assessment.hazards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessment.hazards.length > 0 ? (
            <div className="space-y-4">
              {assessment.hazards.map((hazard) => (
                <div key={hazard.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{hazard.hazardNumber}</Badge>
                      {hazard.riskLevel && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            riskColors[hazard.riskLevel] || ""
                          }`}
                        >
                          {riskLabels[hazard.riskLevel]}
                        </span>
                      )}
                      {hazard.measureType && (
                        <Badge variant="secondary">
                          {measureTypeLabels[hazard.measureType] || hazard.measureType}
                        </Badge>
                      )}
                      {hazard.hazardCategory && (
                        <Badge variant="outline" className="text-xs">
                          {hazard.hazardCategory}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-sm">{hazard.hazardFactor}</p>
                  {hazard.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {hazard.description}
                    </p>
                  )}
                  {hazard.measure && (
                    <p className="text-sm mt-2">
                      <span className="font-medium">Maßnahme:</span>{" "}
                      {hazard.measure}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {hazard.probability && hazard.severity && (
                      <span>
                        W: {hazard.probability} × S: {hazard.severity} ={" "}
                        {hazard.probability * hazard.severity}
                      </span>
                    )}
                    {hazard.responsible && (
                      <span>Verantwortlich: {hazard.responsible}</span>
                    )}
                    {hazard.deadline && (
                      <span>
                        Frist:{" "}
                        {new Date(hazard.deadline).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine Gefährdungen erfasst.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Risk Matrix */}
      {assessment.hazards.some((h) => h.probability && h.severity) && (
        <Card>
          <CardHeader>
            <CardTitle>Risikomatrix (5×5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full max-w-lg mx-auto">
                <thead>
                  <tr>
                    <th className="p-2 text-xs text-muted-foreground"></th>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <th key={s} className="p-2 text-xs text-center">
                        S={s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[5, 4, 3, 2, 1].map((p) => (
                    <tr key={p}>
                      <td className="p-2 text-xs text-muted-foreground text-right">
                        W={p}
                      </td>
                      {[1, 2, 3, 4, 5].map((s) => {
                        const hazardsInCell = assessment.hazards.filter(
                          (h) => h.probability === p && h.severity === s
                        );
                        return (
                          <td key={s} className="p-1">
                            <div
                              className={`rounded-md p-2 text-center min-h-[40px] flex items-center justify-center ${getRiskColor(
                                p,
                                s
                              )} ${
                                hazardsInCell.length > 0
                                  ? "ring-2 ring-offset-1 ring-black"
                                  : "opacity-60"
                              }`}
                            >
                              <span className="text-xs font-bold">
                                {hazardsInCell.length > 0
                                  ? hazardsInCell
                                      .map((h) => `#${h.hazardNumber}`)
                                      .join(", ")
                                  : p * s}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 justify-center mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>1-4 Niedrig</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span>5-9 Mittel</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>10-15 Hoch</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>16-25 Kritisch</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              W = Wahrscheinlichkeit, S = Schwere
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Betrieb</p>
              <p className="text-muted-foreground">{assessment.company.name}</p>
            </div>
            <div>
              <p className="font-medium">Art</p>
              <p className="text-muted-foreground">
                {typeLabels[assessment.assessmentType] || assessment.assessmentType}
              </p>
            </div>
            <div>
              <p className="font-medium">Beurteilter Bereich</p>
              <p className="text-muted-foreground">
                {assessment.assessedArea || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Datum</p>
              <p className="text-muted-foreground">
                {assessment.assessmentDate
                  ? new Date(assessment.assessmentDate).toLocaleDateString("de-DE")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Nächste Überprüfung</p>
              <p className="text-muted-foreground">
                {assessment.nextReviewDate
                  ? new Date(assessment.nextReviewDate).toLocaleDateString("de-DE")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Version</p>
              <p className="text-muted-foreground">{assessment.version}</p>
            </div>
          </div>
          {assessment.legalBasis && (
            <div>
              <p className="font-medium">Rechtsgrundlage</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {assessment.legalBasis}
              </p>
            </div>
          )}
          {assessment.assessedBy && (
            <div>
              <p className="font-medium">Beurteilt von</p>
              <p className="text-muted-foreground">
                {assessment.assessedBy.firstName} {assessment.assessedBy.lastName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
