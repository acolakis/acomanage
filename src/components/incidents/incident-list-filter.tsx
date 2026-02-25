"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Camera, ListChecks } from "lucide-react";
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
  GEMELDET: "Gemeldet",
  IN_UNTERSUCHUNG: "In Untersuchung",
  MASSNAHMEN: "Maßnahmen",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GEMELDET: "secondary",
  IN_UNTERSUCHUNG: "default",
  MASSNAHMEN: "default",
  ABGESCHLOSSEN: "outline",
};

const typeLabels: Record<string, string> = {
  UNFALL: "Unfall",
  BEINAHEUNFALL: "Beinaheunfall",
  VORFALL: "Vorfall",
  BERUFSKRANKHEIT: "Berufskrankheit",
  ERSTEHILFE: "Erste Hilfe",
};

const severityLabels: Record<string, string> = {
  GERING: "Gering",
  MITTEL: "Mittel",
  SCHWER: "Schwer",
  TOEDLICH: "Tödlich",
};

const severityColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GERING: "outline",
  MITTEL: "secondary",
  SCHWER: "default",
  TOEDLICH: "destructive",
};

interface Incident {
  id: string;
  incidentNumber: string | null;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  description: string;
  location: string | null;
  affectedPerson: string | null;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  _count: { photos: number; actions: number };
}

interface IncidentListFilterProps {
  incidents: Incident[];
}

export function IncidentListFilter({ incidents }: IncidentListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (i.incidentNumber && i.incidentNumber.toLowerCase().includes(searchLower)) ||
        i.description.toLowerCase().includes(searchLower) ||
        (i.location && i.location.toLowerCase().includes(searchLower)) ||
        (i.affectedPerson && i.affectedPerson.toLowerCase().includes(searchLower)) ||
        i.company.name.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || i.status === statusFilter;

      const matchesType =
        typeFilter === "all" || i.incidentType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [incidents, search, statusFilter, typeFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nr., Beschreibung, Ort, Person..."
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
          filtered.map((incident) => (
            <Link
              key={incident.id}
              href={`/vorfaelle/${incident.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {incident.incidentNumber || "Ohne Nr."}{" "}
                        <Badge variant="outline" className="ml-2 font-normal">
                          {typeLabels[incident.incidentType] || incident.incidentType}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {incident.description.length > 120
                          ? incident.description.slice(0, 120) + "..."
                          : incident.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={severityColors[incident.severity]}>
                        {severityLabels[incident.severity] || incident.severity}
                      </Badge>
                      <Badge variant={statusColors[incident.status]}>
                        {statusLabels[incident.status] || incident.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      {new Date(incident.incidentDate).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}
                    </span>
                    <span>{incident.company.name}</span>
                    {incident.affectedPerson && (
                      <span>Betroffene/r: {incident.affectedPerson}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {incident._count.photos}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3 w-3" />
                      {incident._count.actions}
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
                  ? "Keine Vorfälle für diese Filter gefunden."
                  : "Noch keine Vorfälle vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
