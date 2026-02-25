import Link from "next/link";
import { Plus, GraduationCap, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { TrainingListFilter } from "@/components/trainings/training-list-filter";

async function getTrainings() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.trainingEvent.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { trainingDate: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function SchulungenPage() {
  const trainings = await getTrainings();

  const companyFilter = getSelectedCompanyFilter();

  const geplantCount = await prisma.trainingEvent.count({
    where: {
      status: "GEPLANT",
      ...companyFilter,
    },
  }).catch(() => 0);

  const now = new Date();
  const ueberfaelligCount = await prisma.trainingEvent.count({
    where: {
      OR: [
        { status: "UEBERFAELLIG", ...companyFilter },
        {
          status: "GEPLANT",
          trainingDate: { lt: now },
          ...companyFilter,
        },
      ],
    },
  }).catch(() => 0);

  const serializedTrainings = JSON.parse(JSON.stringify(trainings));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schulungen & Unterweisungen</h1>
          <p className="text-muted-foreground">
            {trainings.length} Schulungen insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/schulungen/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue Schulung
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{trainings.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{geplantCount}</p>
              <p className="text-xs text-muted-foreground">Geplant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{ueberfaelligCount}</p>
              <p className="text-xs text-muted-foreground">Überfällig</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TrainingListFilter trainings={serializedTrainings} />
    </div>
  );
}
