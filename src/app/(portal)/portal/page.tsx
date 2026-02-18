import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Bell,
  Calendar,
} from "lucide-react";
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

export default async function PortalDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  if (companyIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Kundenportal</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Ihrem Konto ist noch kein Betrieb zugeordnet.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Bitte kontaktieren Sie Ihren Ansprechpartner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch company data
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds }, isActive: true },
    select: { id: true, name: true },
  });

  // Recent documents assigned to companies
  const recentDocs = await prisma.companyDocument.findMany({
    where: { companyId: { in: companyIds } },
    include: {
      document: { select: { title: true, fileType: true, updatedAt: true } },
      company: { select: { name: true } },
    },
    orderBy: { assignedAt: "desc" },
    take: 5,
  });

  // Recent inspections
  const recentInspections = await prisma.inspection.findMany({
    where: { companyId: { in: companyIds }, status: "COMPLETED" },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  // Open measures from risk assessments
  const openMeasures = await prisma.riskAssessmentHazard.count({
    where: {
      status: "open",
      assessment: {
        companyId: { in: companyIds },
        status: { not: "archived" },
      },
    },
  });

  // Unread notifications
  const userId = (session.user as { id: string }).id;
  const unreadNotifications = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  // Upcoming deadlines (hazards with deadline in next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = await prisma.riskAssessmentHazard.findMany({
    where: {
      status: "open",
      deadline: { gte: now, lte: thirtyDaysFromNow },
      assessment: {
        companyId: { in: companyIds },
        status: { not: "archived" },
      },
    },
    include: {
      assessment: {
        select: { title: true, company: { select: { name: true } } },
      },
    },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kundenportal</h1>
        <p className="text-muted-foreground">
          Willkommen, {session.user.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{recentDocs.length}</p>
              <p className="text-xs text-muted-foreground">Aktuelle Dokumente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{recentInspections.length}</p>
              <p className="text-xs text-muted-foreground">Letzte Begehungen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openMeasures}</p>
              <p className="text-xs text-muted-foreground">Offene Maßnahmen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Bell className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{unreadNotifications}</p>
              <p className="text-xs text-muted-foreground">Neue Benachrichtigungen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktuelle Dokumente</CardTitle>
            <CardDescription>Zuletzt zugewiesene Dokumente</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocs.length > 0 ? (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">{doc.document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.company.name}
                        {doc.document.fileType && ` - ${doc.document.fileType.toUpperCase()}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.assignedAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Dokumente vorhanden.
              </p>
            )}
            <Link
              href="/portal/dokumente"
              className="text-sm text-primary hover:underline mt-4 block"
            >
              Alle Dokumente anzeigen
            </Link>
          </CardContent>
        </Card>

        {/* Recent Inspections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Begehungen</CardTitle>
            <CardDescription>Abgeschlossene Begehungsberichte</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInspections.length > 0 ? (
              <div className="space-y-3">
                {recentInspections.map((insp) => (
                  <Link
                    key={insp.id}
                    href={`/portal/begehungen/${insp.id}`}
                    className="flex items-center justify-between text-sm hover:bg-accent/50 rounded-md px-2 py-1 -mx-2"
                  >
                    <div>
                      <p className="font-medium">{insp.company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {insp.inspectionType === "INITIAL"
                          ? "Erstbegehung"
                          : insp.inspectionType === "REGULAR"
                          ? "Regelbegehung"
                          : insp.inspectionType === "FOLLOWUP"
                          ? "Nachkontrolle"
                          : "Sonderbegehung"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {insp.completedAt
                        ? new Date(insp.completedAt).toLocaleDateString("de-DE")
                        : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Begehungen vorhanden.
              </p>
            )}
            <Link
              href="/portal/begehungen"
              className="text-sm text-primary hover:underline mt-4 block"
            >
              Alle Begehungen anzeigen
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Anstehende Fristen
            </CardTitle>
            <CardDescription>Maßnahmen in den nächsten 30 Tagen</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((h) => (
                  <div key={h.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{h.hazardFactor}</p>
                      <Badge variant="outline" className="text-xs">
                        {h.deadline
                          ? new Date(h.deadline).toLocaleDateString("de-DE")
                          : "—"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {h.assessment.company.name} - {h.assessment.title}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine anstehenden Fristen.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ihre Betriebe</CardTitle>
            <CardDescription>Zugewiesene Betriebe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {companies.map((c) => (
                <div key={c.id} className="text-sm font-medium">
                  {c.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
