import Link from "next/link";
import { Plus, FileText, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { UnterweisungList } from "@/components/unterweisungen/unterweisung-list";

async function getUnterweisungen() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.unterweisung.findMany({
      where: { ...companyFilter, status: { not: "archiviert" } },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { datum: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function UnterweisungsnachweisePage() {
  const unterweisungen = await getUnterweisungen();

  const now = new Date();
  const thisMonth = unterweisungen.filter((u) => {
    const d = new Date(u.datum);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const uniqueCompanies = new Set(unterweisungen.map((u) => u.companyId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unterweisungen</h1>
          <p className="text-muted-foreground">
            {unterweisungen.length} Unterweisungen insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/unterweisungsnachweise/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue Unterweisung
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{unterweisungen.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{thisMonth.length}</p>
              <p className="text-xs text-muted-foreground">Diesen Monat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{uniqueCompanies.size}</p>
              <p className="text-xs text-muted-foreground">Betriebe</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <UnterweisungList unterweisungen={JSON.parse(JSON.stringify(unterweisungen))} />
    </div>
  );
}
