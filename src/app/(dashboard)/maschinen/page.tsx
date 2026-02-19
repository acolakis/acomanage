import Link from "next/link";
import { Plus, Cog, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { MachineListFilter } from "@/components/machines/machine-list-filter";

async function getMachines() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.machine.findMany({
      where: { status: { not: "archived" }, ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function MaschinenPage() {
  const machines = await getMachines();

  const companyCount = new Set(machines.map((m) => m.companyId)).size;

  const serializedMachines = JSON.parse(JSON.stringify(machines));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maschinen</h1>
          <p className="text-muted-foreground">
            {machines.length} Maschinen erfasst
          </p>
        </div>
        <Button asChild>
          <Link href="/maschinen/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue Maschine
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Cog className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{machines.length}</p>
              <p className="text-xs text-muted-foreground">Maschinen gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{companyCount}</p>
              <p className="text-xs text-muted-foreground">Betriebe</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MachineListFilter machines={serializedMachines} />
    </div>
  );
}
