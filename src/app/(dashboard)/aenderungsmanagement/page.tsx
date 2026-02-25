import Link from "next/link";
import { Plus, FileText, Clock, CheckCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { ChangeRequestListFilter } from "@/components/changes/change-list-filter";

async function getChangeRequests() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.changeRequest.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function AenderungsmanagementPage() {
  const changeRequests = await getChangeRequests();

  const totalCount = changeRequests.length;
  const openCount = changeRequests.filter((cr) =>
    ["BEANTRAGT", "BEWERTET"].includes(cr.status)
  ).length;
  const approvedCount = changeRequests.filter(
    (cr) => cr.status === "GENEHMIGT"
  ).length;
  const implementedCount = changeRequests.filter(
    (cr) => cr.status === "UMGESETZT"
  ).length;

  const serializedChangeRequests = JSON.parse(JSON.stringify(changeRequests));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Änderungsmanagement</h1>
          <p className="text-muted-foreground">
            {totalCount} Änderungsanträge insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/aenderungsmanagement/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Änderungsantrag
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Genehmigt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Settings className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{implementedCount}</p>
              <p className="text-xs text-muted-foreground">Umgesetzt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChangeRequestListFilter changeRequests={serializedChangeRequests} />
    </div>
  );
}
