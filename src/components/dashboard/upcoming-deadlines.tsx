import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const priorityColors: Record<string, string> = {
  KRITISCH: "bg-red-100 text-red-800",
  HOCH: "bg-orange-100 text-orange-800",
  MITTEL: "bg-yellow-100 text-yellow-800",
  NIEDRIG: "bg-green-100 text-green-800",
};

export async function UpcomingDeadlines() {
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const findings = await prisma.inspectionFinding.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      deadline: { not: null, lte: in30Days },
    },
    orderBy: { deadline: "asc" },
    take: 10,
    include: {
      inspection: {
        select: {
          id: true,
          inspectionNumber: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Anstehende Fristen
        </CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine anstehenden Fristen.</p>
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => {
              const isOverdue = finding.deadline && finding.deadline < now;
              return (
                <Link
                  key={finding.id}
                  href={`/begehungen/${finding.inspection.id}`}
                  className="flex items-start gap-3 rounded-md p-2 hover:bg-muted transition-colors"
                >
                  {isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isOverdue ? "text-destructive" : ""}`}>
                      {finding.description.length > 60
                        ? finding.description.slice(0, 60) + "..."
                        : finding.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {finding.inspection.company.name} — Begehung {finding.inspection.inspectionNumber || ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {finding.riskLevel && (
                      <Badge className={priorityColors[finding.riskLevel] || ""}>
                        {finding.riskLevel}
                      </Badge>
                    )}
                    <p className={`text-xs mt-0.5 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {isOverdue ? "Überfällig: " : ""}
                      {finding.deadline!.toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
