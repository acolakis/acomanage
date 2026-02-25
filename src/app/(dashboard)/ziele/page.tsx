import Link from "next/link";
import { Plus, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { ZieleListFilter } from "@/components/objectives/ziele-list-filter";

async function getObjectives() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.ohsObjective.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { progress: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function ZielePage() {
  const objectives = await getObjectives();

  const activeCount = objectives.filter((o) => o.status === "AKTIV").length;
  const achievedCount = objectives.filter((o) => o.status === "ERREICHT").length;

  const serializedObjectives = JSON.parse(JSON.stringify(objectives));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SGA-Ziele</h1>
          <p className="text-muted-foreground">
            {objectives.length} Ziele insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/ziele/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neues Ziel
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Target className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{objectives.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aktiv</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{achievedCount}</p>
              <p className="text-xs text-muted-foreground">Erreicht</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ZieleListFilter objectives={serializedObjectives} />
    </div>
  );
}
