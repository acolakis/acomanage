"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  UMGESETZT: "Umgesetzt",
  WIRKSAMKEIT_GEPRUEFT: "Wirksamkeit geprueft",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OFFEN: "secondary",
  IN_BEARBEITUNG: "default",
  UMGESETZT: "default",
  WIRKSAMKEIT_GEPRUEFT: "default",
  ABGESCHLOSSEN: "outline",
};

const sourceTypeLabels: Record<string, string> = {
  BEGEHUNG: "Begehung",
  GBU: "GBU",
  VORFALL: "Vorfall",
  AUDIT: "Audit",
  MANAGEMENT_REVIEW: "Managementbewertung",
  EXTERN: "Extern",
  SONSTIG: "Sonstig",
};

const priorityLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  SOFORT: "Sofort",
};

const priorityColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NIEDRIG: "outline",
  MITTEL: "secondary",
  HOCH: "default",
  SOFORT: "destructive",
};

interface CorrectiveActionItem {
  id: string;
  actionNumber: string | null;
  title: string;
  description: string | null;
  sourceType: string;
  priority: string;
  status: string;
  measureType: string | null;
  deadline: string | null;
  completedAt: string | null;
  company: { id: string; name: string };
  responsible: { firstName: string; lastName: string } | null;
  incident: { id: string; incidentNumber: string | null } | null;
  createdBy: { firstName: string; lastName: string } | null;
}

interface ActionListFilterProps {
  actions: CorrectiveActionItem[];
}

export function ActionListFilter({ actions }: ActionListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (a.actionNumber || "").toLowerCase().includes(searchLower) ||
        a.title.toLowerCase().includes(searchLower) ||
        (a.description || "").toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;

      const matchesSourceType =
        sourceTypeFilter === "all" || a.sourceType === sourceTypeFilter;

      const matchesPriority =
        priorityFilter === "all" || a.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesSourceType && matchesPriority;
    });
  }, [actions, search, statusFilter, sourceTypeFilter, priorityFilter]);

  const isOverdue = (deadline: string | null, status: string) => {
    if (!deadline || status === "ABGESCHLOSSEN") return false;
    return new Date(deadline) < new Date();
  };

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nr., Titel, Beschreibung..."
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
        <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Quellen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Quellen</SelectItem>
            {Object.entries(sourceTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Prioritäten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritäten</SelectItem>
            {Object.entries(priorityLabels).map(([value, label]) => (
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
          filtered.map((action) => (
            <Link
              key={action.id}
              href={`/massnahmen/${action.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {action.actionNumber && (
                          <span>{action.actionNumber}</span>
                        )}
                        <Badge variant="outline">
                          {sourceTypeLabels[action.sourceType] || action.sourceType}
                        </Badge>
                        <span>{action.company.name}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityColors[action.priority]}>
                        {priorityLabels[action.priority] || action.priority}
                      </Badge>
                      <Badge variant={statusColors[action.status]}>
                        {statusLabels[action.status] || action.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {action.responsible && (
                      <span>
                        {action.responsible.firstName}{" "}
                        {action.responsible.lastName}
                      </span>
                    )}
                    {action.deadline && (
                      <span
                        className={
                          isOverdue(action.deadline, action.status)
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        Frist:{" "}
                        {new Date(action.deadline).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {isOverdue(action.deadline, action.status) &&
                          " (überfällig)"}
                      </span>
                    )}
                    {action.incident && (
                      <span>
                        Vorfall: {action.incident.incidentNumber || action.incident.id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {search ||
                statusFilter !== "all" ||
                sourceTypeFilter !== "all" ||
                priorityFilter !== "all"
                  ? "Keine Massnahmen für diese Filter gefunden."
                  : "Noch keine Massnahmen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
