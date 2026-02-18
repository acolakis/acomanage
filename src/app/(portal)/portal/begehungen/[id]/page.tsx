import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
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

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

const riskColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  NIEDRIG: "secondary",
  MITTEL: "outline",
  HOCH: "default",
  KRITISCH: "destructive",
};

export default async function PortalBegehungDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const inspection = await prisma.inspection.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { name: true } },
      inspector: { select: { firstName: true, lastName: true } },
      findings: {
        orderBy: { findingNumber: "asc" },
      },
    },
  });

  if (!inspection || !companyIds.includes(inspection.companyId)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/begehungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Begehungsbericht
          </h1>
          <p className="text-muted-foreground">
            {inspection.company.name}
            {inspection.inspector &&
              ` - ${inspection.inspector.firstName} ${inspection.inspector.lastName}`}
            {inspection.completedAt &&
              ` - ${new Date(inspection.completedAt).toLocaleDateString("de-DE")}`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/inspections/${inspection.id}/pdf`}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF herunterladen
          </a>
        </Button>
      </div>

      {/* Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Befunde ({inspection.findings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {inspection.findings.length > 0 ? (
            <div className="space-y-4">
              {inspection.findings.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">
                      {f.findingNumber}. Befund
                    </p>
                    {f.riskLevel && (
                      <Badge variant={riskColors[f.riskLevel]}>
                        {riskLabels[f.riskLevel]}
                      </Badge>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {f.description}
                    </p>
                  )}
                  {f.measure && (
                    <p className="text-sm">
                      <span className="font-medium">Maßnahme:</span>{" "}
                      {f.measure}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {f.responsible && <span>Verantwortlich: {f.responsible}</span>}
                    {f.deadline && (
                      <span>
                        Frist: {new Date(f.deadline).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Befunde.</p>
          )}
        </CardContent>
      </Card>

      {inspection.generalNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Anmerkungen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{inspection.generalNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
