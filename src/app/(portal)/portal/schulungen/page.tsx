import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
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
  ERSTUNTERWEISUNG: "Erstunterweisung",
  UNTERWEISUNG: "Unterweisung",
  FORTBILDUNG: "Fortbildung",
  ZERTIFIKAT: "Zertifikat",
  ERSTE_HILFE: "Erste Hilfe",
  BRANDSCHUTZ: "Brandschutz",
  GEFAHRSTOFF: "Gefahrstoff",
  PSA: "PSA",
  MASCHINE: "Maschine",
  ELEKTRO: "Elektro",
  HOEHENARBEIT: "Höhenarbeit",
  STAPLERFAHRER: "Staplerfahrer",
  BILDSCHIRMARBEIT: "Bildschirmarbeit",
  SONSTIG: "Sonstig",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  DURCHGEFUEHRT: "Durchgeführt",
  ABGESAGT: "Abgesagt",
  UEBERFAELLIG: "Überfällig",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GEPLANT: "secondary",
  DURCHGEFUEHRT: "outline",
  ABGESAGT: "destructive",
  UEBERFAELLIG: "destructive",
};

export default async function PortalSchulungenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const trainings = await prisma.trainingEvent.findMany({
    where: {
      companyId: { in: companyIds },
    },
    include: {
      company: { select: { name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { trainingDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Schulungen & Unterweisungen
        </h1>
        <p className="text-muted-foreground">
          {trainings.length} Schulungen
        </p>
      </div>

      {trainings.length > 0 ? (
        <div className="space-y-3">
          {trainings.map((training) => (
            <Card key={training.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {training.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {training.company.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">
                      {typeLabels[training.trainingType] || training.trainingType}
                    </Badge>
                    <Badge variant={statusColors[training.status]}>
                      {statusLabels[training.status] || training.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {training.trainingDate && (
                    <span>
                      {new Date(training.trainingDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {training.instructor && (
                    <span>Referent: {training.instructor}</span>
                  )}
                  <span>{training._count.participants} Teilnehmer</span>
                  {training.legalBasis && (
                    <span>{training.legalBasis}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Schulungen erfasst.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
