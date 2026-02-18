import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
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
  INITIAL: "Erstbegehung",
  REGULAR: "Regelbegehung",
  FOLLOWUP: "Nachkontrolle",
  SPECIAL: "Sonderbegehung",
};

export default async function PortalBegehungenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const inspections = await prisma.inspection.findMany({
    where: {
      companyId: { in: companyIds },
      status: "COMPLETED",
    },
    include: {
      company: { select: { name: true } },
      inspector: { select: { firstName: true, lastName: true } },
      _count: { select: { findings: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Begehungen</h1>
        <p className="text-muted-foreground">
          {inspections.length} abgeschlossene Begehungen
        </p>
      </div>

      {inspections.length > 0 ? (
        <div className="space-y-3">
          {inspections.map((insp) => (
            <Link
              key={insp.id}
              href={`/portal/begehungen/${insp.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {insp.company.name}
                      </CardTitle>
                      <CardDescription>
                        {typeLabels[insp.inspectionType] || insp.inspectionType}
                        {insp.inspector &&
                          ` - ${insp.inspector.firstName} ${insp.inspector.lastName}`}
                      </CardDescription>
                    </div>
                    <Badge>{insp._count.findings} Befunde</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground">
                    {insp.completedAt
                      ? new Date(insp.completedAt).toLocaleDateString("de-DE")
                      : "—"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Begehungen abgeschlossen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
