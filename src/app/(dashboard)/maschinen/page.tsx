import Link from "next/link";
import { Plus, Cog, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

async function getMachines() {
  try {
    return await prisma.machine.findMany({
      where: { status: { not: "archived" } },
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

  // Group by company
  const grouped: Record<string, { companyName: string; machines: typeof machines }> = {};
  for (const m of machines) {
    if (!grouped[m.companyId]) {
      grouped[m.companyId] = { companyName: m.company.name, machines: [] };
    }
    grouped[m.companyId].machines.push(m);
  }

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
              <p className="text-2xl font-bold">{Object.keys(grouped).length}</p>
              <p className="text-xs text-muted-foreground">Betriebe</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine List grouped by company */}
      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([companyId, data]) => (
          <Card key={companyId}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {data.companyName}
              </CardTitle>
              <CardDescription>{data.machines.length} Maschinen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.machines.map((m) => (
                  <Link
                    key={m.id}
                    href={`/maschinen/${m.id}`}
                    className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {m.manufacturer && <span>{m.manufacturer}</span>}
                        {m.model && <span>{m.model}</span>}
                        {m.location && <span>- {m.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.serialNumber && (
                        <Badge variant="outline" className="text-xs">
                          S/N: {m.serialNumber}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cog className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Maschinen erfasst.
            </p>
            <Button asChild className="mt-4">
              <Link href="/maschinen/neu">Erste Maschine erfassen</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
