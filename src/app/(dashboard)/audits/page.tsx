import Link from "next/link";
import { Plus, ClipboardCheck, CalendarCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { AuditListFilter } from "@/components/audits/audit-list-filter";

async function getAudits() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.internalAudit.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        auditor: { select: { firstName: true, lastName: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function AuditsPage() {
  const audits = await getAudits();

  const companyFilter = getSelectedCompanyFilter();
  const openAudits = await prisma.internalAudit.count({
    where: {
      status: { in: ["GEPLANT", "IN_DURCHFUEHRUNG", "BERICHT"] },
      ...companyFilter,
    },
  }).catch(() => 0);

  const completedAudits = await prisma.internalAudit.count({
    where: {
      status: "ABGESCHLOSSEN",
      ...companyFilter,
    },
  }).catch(() => 0);

  const serializedAudits = JSON.parse(JSON.stringify(audits));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interne Audits</h1>
          <p className="text-muted-foreground">
            {audits.length} Audits insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/audits/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neues Audit
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{audits.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openAudits}</p>
              <p className="text-xs text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{completedAudits}</p>
              <p className="text-xs text-muted-foreground">Abgeschlossen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuditListFilter audits={serializedAudits} />
    </div>
  );
}
