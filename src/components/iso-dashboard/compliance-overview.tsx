"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Target,
  BookOpen,
  HardHat,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Shield,
} from "lucide-react";
import type { ComplianceLevel, ClauseData, IsoDashboardData } from "@/app/(dashboard)/iso-dashboard/page";

const clauseIcons: Record<number, React.ElementType> = {
  4: Building2,
  5: Users,
  6: Target,
  7: BookOpen,
  8: HardHat,
  9: BarChart3,
  10: TrendingUp,
};

const levelConfig: Record<
  ComplianceLevel,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: React.ElementType;
    iconClass: string;
  }
> = {
  gruen: {
    label: "Konform",
    bgClass: "bg-green-100",
    textClass: "text-green-800",
    borderClass: "border-green-300",
    icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  gelb: {
    label: "Teilweise",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-800",
    borderClass: "border-yellow-300",
    icon: AlertCircle,
    iconClass: "text-yellow-600",
  },
  rot: {
    label: "Handlungsbedarf",
    bgClass: "bg-red-100",
    textClass: "text-red-800",
    borderClass: "border-red-300",
    icon: XCircle,
    iconClass: "text-red-600",
  },
};

function MetricBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="font-semibold text-foreground">{value}</span> {label}
    </span>
  );
}

function getMetricBadges(clause: ClauseData): { label: string; value: string | number }[] {
  const m = clause.metrics;
  switch (clause.clause) {
    case 4:
      return [
        { label: "vollstaendig", value: m.contextsComplete as number },
        { label: "teilweise", value: m.contextsPartial as number },
        { label: "Betriebe gesamt", value: m.totalCompanies as number },
      ];
    case 5:
      return [
        { label: "SGA-Politik", value: `${m.policyDefined}/${m.totalCompanies}` },
        { label: "Rollen definiert", value: `${m.rolesDefined}/${m.totalCompanies}` },
        { label: "Beteiligung", value: `${m.participationDefined}/${m.totalCompanies}` },
      ];
    case 6:
      return [
        { label: "aktive GBU", value: m.activeRiskAssessments as number },
        { label: "aktive Ziele", value: m.activeObjectives as number },
        {
          label: "Rechtsanf. konform",
          value: `${m.konformLegalReqs}/${m.totalLegalReqs}`,
        },
      ];
    case 7:
      return [
        { label: "Schulungen durchgef.", value: m.completedTrainings as number },
        { label: "ueberfaellig", value: m.overdueTrainings as number },
        { label: "Dokumente", value: m.totalDocuments as number },
      ];
    case 8:
      return [
        { label: "Begehungen (12 Mon.)", value: m.completedInspections as number },
        { label: "Notfallplaene", value: m.activeEmergencyPlans as number },
        { label: "offene Aenderungen", value: m.openChangeRequests as number },
      ];
    case 9:
      return [
        { label: "Audits abgeschl.", value: m.completedAudits as number },
        { label: "Bewertungen genehm.", value: m.approvedReviews as number },
      ];
    case 10:
      return [
        { label: "offene Vorfaelle", value: m.openIncidents as number },
        { label: "ueberfaellige Massn.", value: m.overdueActions as number },
        {
          label: "Massn. umgesetzt",
          value: `${m.completedActions}/${m.totalActions}`,
        },
      ];
    default:
      return [];
  }
}

interface ComplianceOverviewProps {
  data: IsoDashboardData;
}

export function ComplianceOverview({ data }: ComplianceOverviewProps) {
  const { companyName, clauses } = data;

  const greenCount = clauses.filter((c) => c.level === "gruen").length;
  const compliancePercent = Math.round((greenCount / clauses.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ISO 45001:2018 Compliance-Status
            </h1>
            <p className="text-muted-foreground">
              {companyName
                ? `Compliance-Uebersicht fuer ${companyName}`
                : "Compliance-Uebersicht ueber alle Betriebe"}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Gesamt-Compliance</CardTitle>
          <CardDescription>
            {greenCount} von {clauses.length} Klauseln vollstaendig erfuellt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Progress value={compliancePercent} className="flex-1" />
            <span className="text-2xl font-bold tabular-nums">
              {compliancePercent}%
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <span>
                {clauses.filter((c) => c.level === "gruen").length} Konform
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
              <span>
                {clauses.filter((c) => c.level === "gelb").length} Teilweise
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <span>
                {clauses.filter((c) => c.level === "rot").length} Handlungsbedarf
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clause Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clauses.map((clause) => {
          const config = levelConfig[clause.level];
          const Icon = clauseIcons[clause.clause];
          const StatusIcon = config.icon;
          const badges = getMetricBadges(clause);

          return (
            <Card
              key={clause.clause}
              className={`${config.borderClass} border-2`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold">
                      Klausel {clause.clause}
                    </CardTitle>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${config.iconClass}`} />
                </div>
                <CardDescription className="text-xs leading-snug">
                  {clause.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge
                  className={`${config.bgClass} ${config.textClass} border ${config.borderClass} hover:${config.bgClass}`}
                  variant="outline"
                >
                  {config.label}
                </Badge>
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((badge, i) => (
                    <MetricBadge
                      key={i}
                      label={badge.label}
                      value={badge.value}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {clause.statusText}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Detailuebersicht nach Klauseln
          </CardTitle>
          <CardDescription>
            Status, Kennzahlen und empfohlene Massnahmen fuer jede ISO
            45001-Klausel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Klausel</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead>Kennzahlen</TableHead>
                <TableHead>Empfohlene Massnahme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clauses.map((clause) => {
                const config = levelConfig[clause.level];
                const StatusIcon = config.icon;
                const badges = getMetricBadges(clause);

                return (
                  <TableRow key={clause.clause}>
                    <TableCell className="font-medium">
                      Klausel {clause.clause}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{clause.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clause.statusText}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon
                          className={`h-4 w-4 ${config.iconClass}`}
                        />
                        <Badge
                          className={`${config.bgClass} ${config.textClass} border ${config.borderClass} hover:${config.bgClass}`}
                          variant="outline"
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {badges.map((badge, i) => (
                          <MetricBadge
                            key={i}
                            label={badge.label}
                            value={badge.value}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {clause.recommendation}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
