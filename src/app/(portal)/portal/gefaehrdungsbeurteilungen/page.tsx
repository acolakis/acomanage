import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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

export default async function PortalGbuPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const assessments = await prisma.riskAssessment.findMany({
    where: {
      companyId: { in: companyIds },
      status: { not: "archived" },
    },
    include: {
      company: { select: { name: true } },
      hazards: {
        select: {
          riskLevel: true,
          status: true,
          hazardFactor: true,
          measure: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gefährdungsbeurteilungen
        </h1>
        <p className="text-muted-foreground">
          {assessments.length} Beurteilungen
        </p>
      </div>

      {assessments.length > 0 ? (
        <div className="space-y-4">
          {assessments.map((a) => {
            const highRisk = a.hazards.filter(
              (h) => h.riskLevel === "HOCH" || h.riskLevel === "KRITISCH"
            ).length;
            const openCount = a.hazards.filter(
              (h) => h.status === "open"
            ).length;

            return (
              <Link key={a.id} href={`/portal/gefaehrdungsbeurteilungen/${a.id}`} className="block">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <CardDescription>
                        {a.company.name} - {typeLabels[a.assessmentType] || a.assessmentType}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {statusLabels[a.status] || a.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{a.hazards.length} Gefährdungen</span>
                    {highRisk > 0 && (
                      <span className="text-red-600 font-medium">
                        {highRisk} Hoch/Kritisch
                      </span>
                    )}
                    {openCount > 0 && (
                      <span className="text-yellow-600">
                        {openCount} offen
                      </span>
                    )}
                  </div>
                  {a.hazards.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {a.hazards
                        .filter((h) => h.riskLevel === "HOCH" || h.riskLevel === "KRITISCH")
                        .slice(0, 3)
                        .map((h, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {h.riskLevel && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                  riskColors[h.riskLevel] || ""
                                }`}
                              >
                                {riskLabels[h.riskLevel]}
                              </span>
                            )}
                            <span>{h.hazardFactor}</span>
                            {h.measure && (
                              <span className="text-muted-foreground truncate max-w-[200px]">
                                - {h.measure}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Keine Gefährdungsbeurteilungen vorhanden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
