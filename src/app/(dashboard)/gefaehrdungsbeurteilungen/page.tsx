import Link from "next/link";
import { Plus, ShieldAlert, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { AssessmentListFilter } from "@/components/risk-assessments/assessment-list-filter";

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

  const serializedAssessments = JSON.parse(JSON.stringify(assessments));

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

      <AssessmentListFilter assessments={serializedAssessments} />
    </div>
  );
}
