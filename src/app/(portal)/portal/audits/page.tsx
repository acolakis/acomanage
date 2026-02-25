import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
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
  SYSTEM: "Systemaudit",
  PROZESS: "Prozessaudit",
  COMPLIANCE: "Compliance-Audit",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_DURCHFUEHRUNG: "In Durchführung",
  BERICHT: "Bericht",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GEPLANT: "secondary",
  IN_DURCHFUEHRUNG: "default",
  BERICHT: "outline",
  ABGESCHLOSSEN: "outline",
};

const statusClasses: Record<string, string> = {
  ABGESCHLOSSEN: "border-green-300 text-green-700 bg-green-50",
};

export default async function PortalAuditsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const audits = await prisma.internalAudit.findMany({
    where: {
      companyId: { in: companyIds },
    },
    include: {
      company: { select: { name: true } },
      auditor: { select: { firstName: true, lastName: true } },
      _count: { select: { findings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Interne Audits
        </h1>
        <p className="text-muted-foreground">
          {audits.length} Audits
        </p>
      </div>

      {audits.length > 0 ? (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Card key={audit.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {audit.auditNumber ? `${audit.auditNumber} — ` : ""}
                      {audit.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {audit.company.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">
                      {typeLabels[audit.auditType] || audit.auditType}
                    </Badge>
                    <Badge
                      variant={statusColors[audit.status]}
                      className={statusClasses[audit.status] || ""}
                    >
                      {statusLabels[audit.status] || audit.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {audit.plannedDate && (
                    <span>
                      Geplant:{" "}
                      {new Date(audit.plannedDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {audit.auditor && (
                    <span>
                      Auditor: {audit.auditor.firstName} {audit.auditor.lastName}
                    </span>
                  )}
                  <span>{audit._count.findings} Feststellungen</span>
                  {audit.isoClause && (
                    <span>ISO {audit.isoClause}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine internen Audits erfasst.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
