"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, AlertTriangle } from "lucide-react";
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
  GEPLANT: "Geplant",
  IN_DURCHFUEHRUNG: "In Durchführung",
  BERICHT: "Bericht",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GEPLANT: "secondary",
  IN_DURCHFUEHRUNG: "default",
  BERICHT: "outline",
  ABGESCHLOSSEN: "outline",
};

const statusStyles: Record<string, string> = {
  ABGESCHLOSSEN: "border-green-300 text-green-700 bg-green-50",
};

const auditTypeLabels: Record<string, string> = {
  SYSTEM: "Systemaudit",
  PROZESS: "Prozessaudit",
  COMPLIANCE: "Complianceaudit",
};

interface Audit {
  id: string;
  auditNumber: string | null;
  title: string;
  auditType: string;
  status: string;
  isoClause: string | null;
  plannedDate: string | null;
  actualDate: string | null;
  auditees: string | null;
  company: { id: string; name: string };
  auditor: { firstName: string; lastName: string } | null;
  _count: { findings: number };
}

interface AuditListFilterProps {
  audits: Audit[];
}

export function AuditListFilter({ audits }: AuditListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (a.auditNumber && a.auditNumber.toLowerCase().includes(searchLower)) ||
        a.title.toLowerCase().includes(searchLower) ||
        a.company.name.toLowerCase().includes(searchLower) ||
        (a.isoClause && a.isoClause.toLowerCase().includes(searchLower)) ||
        (a.auditor &&
          `${a.auditor.firstName} ${a.auditor.lastName}`
            .toLowerCase()
            .includes(searchLower));

      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;

      const matchesType =
        typeFilter === "all" || a.auditType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [audits, search, statusFilter, typeFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nr., Titel, Betrieb, Auditor..."
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(auditTypeLabels).map(([value, label]) => (
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
          filtered.map((audit) => (
            <Link
              key={audit.id}
              href={`/audits/${audit.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {audit.auditNumber || "Ohne Nr."}{" "}
                        <Badge variant="outline" className="ml-2 font-normal">
                          {auditTypeLabels[audit.auditType] || audit.auditType}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {audit.title}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={statusVariants[audit.status]}
                        className={statusStyles[audit.status] || ""}
                      >
                        {statusLabels[audit.status] || audit.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{audit.company.name}</span>
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
                    {audit.isoClause && (
                      <span>ISO: {audit.isoClause}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {audit._count.findings} Feststellungen
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Keine Audits für diese Filter gefunden."
                  : "Noch keine Audits vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
