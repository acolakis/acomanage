import Link from "next/link";
import { Plus, ShieldAlert, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { NotfallplanListFilter } from "@/components/emergency/notfallplan-list-filter";

async function getEmergencyPlans() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.emergencyPlan.findMany({
      where: { isActive: true, ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { drills: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function NotfallplanungPage() {
  const plans = await getEmergencyPlans();

  const companyFilter = getSelectedCompanyFilter();

  const overdueCount = await prisma.emergencyPlan.count({
    where: {
      isActive: true,
      nextDrillDate: { lt: new Date() },
      ...companyFilter,
    },
  }).catch(() => 0);

  const upcomingCount = await prisma.emergencyPlan.count({
    where: {
      isActive: true,
      nextDrillDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      ...companyFilter,
    },
  }).catch(() => 0);

  const serializedPlans = JSON.parse(JSON.stringify(plans));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notfallplanung</h1>
          <p className="text-muted-foreground">
            {plans.length} Notfallpläne insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/notfallplanung/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Notfallplan
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{plans.length}</p>
              <p className="text-xs text-muted-foreground">Aktive Pläne</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{upcomingCount}</p>
              <p className="text-xs text-muted-foreground">Übungen in 30 Tagen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Überfällige Übungen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <NotfallplanListFilter plans={serializedPlans} />
    </div>
  );
}
