"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Calendar, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const statusLabels: Record<string, string> = {
  ENTWURF: "Entwurf",
  AKTIV: "Aktiv",
  ERREICHT: "Erreicht",
  NICHT_ERREICHT: "Nicht erreicht",
  ARCHIVIERT: "Archiviert",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ENTWURF: "secondary",
  AKTIV: "default",
  ERREICHT: "outline",
  NICHT_ERREICHT: "destructive",
  ARCHIVIERT: "outline",
};

const statusClasses: Record<string, string> = {
  ERREICHT: "border-green-300 text-green-700 bg-green-50",
};

interface Objective {
  id: string;
  title: string;
  description: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  status: string;
  targetDate: string | null;
  startDate: string | null;
  isoClause: string | null;
  company: { id: string; name: string };
  responsible: { firstName: string; lastName: string } | null;
  createdBy: { firstName: string; lastName: string } | null;
  _count: { progress: number };
}

interface ZieleListFilterProps {
  objectives: Objective[];
}

function getProgressPercent(current: string | null, target: string | null): number | null {
  if (!current || !target) return null;
  const c = parseFloat(current);
  const t = parseFloat(target);
  if (isNaN(c) || isNaN(t) || t === 0) return null;
  return Math.min(100, Math.max(0, (c / t) * 100));
}

export function ZieleListFilter({ objectives }: ZieleListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return objectives.filter((o) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        o.title.toLowerCase().includes(searchLower) ||
        (o.description && o.description.toLowerCase().includes(searchLower)) ||
        o.company.name.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [objectives, search, statusFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel, Beschreibung, Betrieb..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((objective) => {
            const progressPercent = getProgressPercent(
              objective.currentValue,
              objective.targetValue
            );
            const isOverdue =
              objective.targetDate &&
              objective.status !== "ERREICHT" &&
              objective.status !== "ARCHIVIERT" &&
              new Date(objective.targetDate) < new Date();

            return (
              <Link
                key={objective.id}
                href={`/ziele/${objective.id}`}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">
                          {objective.title}
                        </CardTitle>
                        {objective.description && (
                          <CardDescription className="mt-1">
                            {objective.description.length > 120
                              ? objective.description.slice(0, 120) + "..."
                              : objective.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge
                        variant={statusColors[objective.status]}
                        className={statusClasses[objective.status] || ""}
                      >
                        {statusLabels[objective.status] || objective.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress bar */}
                    {progressPercent !== null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>
                            {objective.currentValue} / {objective.targetValue}{" "}
                            {objective.unit || ""}
                          </span>
                          <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}

                    {/* Target value without progress */}
                    {progressPercent === null &&
                      objective.targetValue && (
                        <div className="mb-3 text-sm text-muted-foreground">
                          Ziel: {objective.targetValue} {objective.unit || ""}
                          {objective.currentValue && (
                            <span className="ml-2">
                              (Aktuell: {objective.currentValue} {objective.unit || ""})
                            </span>
                          )}
                        </div>
                      )}

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>{objective.company.name}</span>
                      {objective.targetDate && (
                        <span
                          className={`flex items-center gap-1 ${
                            isOverdue ? "text-destructive font-medium" : ""
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(objective.targetDate).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                          {isOverdue && " (überfällig)"}
                        </span>
                      )}
                      {objective.responsible && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {objective.responsible.firstName}{" "}
                          {objective.responsible.lastName}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Keine Ziele für diese Filter gefunden."
                  : "Noch keine SGA-Ziele vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
