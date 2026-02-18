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
  DRAFT: "Entwurf",
  IN_PROGRESS: "In Bearbeitung",
  COMPLETED: "Abgeschlossen",
  SENT: "Versendet",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  SENT: "outline",
};

const typeLabels: Record<string, string> = {
  INITIAL: "Erstbegehung",
  REGULAR: "Regelbegehung",
  FOLLOWUP: "Nachkontrolle",
  SPECIAL: "Sonderbegehung",
};

interface Inspection {
  id: string;
  inspectionNumber: string;
  inspectionType: string;
  status: string;
  inspectionDate: string;
  company: { id: string; name: string; city: string | null };
  inspector: { firstName: string; lastName: string };
  _count: { findings: number; photos: number };
}

interface InspectionListFilterProps {
  inspections: Inspection[];
}

export function InspectionListFilter({ inspections }: InspectionListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return inspections.filter((i) => {
      const matchesSearch =
        !search ||
        i.company.name.toLowerCase().includes(search.toLowerCase()) ||
        `${i.inspector.firstName} ${i.inspector.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        i.inspectionNumber.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || i.status === statusFilter;

      const matchesType =
        typeFilter === "all" || i.inspectionType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [inspections, search, statusFilter, typeFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Betrieb, Prüfer, Nr..."
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
            {Object.entries(typeLabels).map(([value, label]) => (
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
          filtered.map((inspection) => (
            <Link
              key={inspection.id}
              href={`/begehungen/${inspection.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {inspection.company.name}
                        {inspection.company.city &&
                          ` (${inspection.company.city})`}
                      </CardTitle>
                      <CardDescription>
                        {inspection.inspectionNumber} &middot;{" "}
                        {typeLabels[inspection.inspectionType]}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[inspection.status]}>
                      {statusLabels[inspection.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      {new Date(inspection.inspectionDate).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}
                    </span>
                    <span>
                      {inspection.inspector.firstName}{" "}
                      {inspection.inspector.lastName}
                    </span>
                    <span>{inspection._count.findings} Befunde</span>
                    <span>{inspection._count.photos} Fotos</span>
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
                  ? "Keine Begehungen für diese Filter gefunden."
                  : "Noch keine Begehungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
