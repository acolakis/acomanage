import Link from "next/link";
import { Plus, ClipboardCheck, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { InspectionListFilter } from "@/components/inspections/inspection-list-filter";

async function getInspections() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.inspection.findMany({
      where: { ...companyFilter },
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

  const companyFilter = getSelectedCompanyFilter();
  const openFindings = await prisma.inspectionFinding.count({
    where: {
      status: { in: ["OPEN", "OVERDUE"] },
      ...(Object.keys(companyFilter).length > 0 ? { inspection: companyFilter } : {}),
    },
  }).catch(() => 0);

  const serializedInspections = JSON.parse(JSON.stringify(inspections));

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

      <InspectionListFilter inspections={serializedInspections} />
    </div>
  );
}
