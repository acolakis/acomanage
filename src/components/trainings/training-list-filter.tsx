"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, BookOpen } from "lucide-react";
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
  DURCHGEFUEHRT: "Durchgeführt",
  ABGESAGT: "Abgesagt",
  UEBERFAELLIG: "Überfällig",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  GEPLANT: "secondary",
  DURCHGEFUEHRT: "outline",
  ABGESAGT: "destructive",
  UEBERFAELLIG: "destructive",
};

const typeLabels: Record<string, string> = {
  ERSTUNTERWEISUNG: "Erstunterweisung",
  UNTERWEISUNG: "Unterweisung",
  FORTBILDUNG: "Fortbildung",
  ZERTIFIKAT: "Zertifikat",
  ERSTE_HILFE: "Erste Hilfe",
  BRANDSCHUTZ: "Brandschutz",
  GEFAHRSTOFF: "Gefahrstoff",
  PSA: "PSA",
  MASCHINE: "Maschine",
  ELEKTRO: "Elektro",
  HOEHENARBEIT: "Höhenarbeit",
  STAPLERFAHRER: "Staplerfahrer",
  BILDSCHIRMARBEIT: "Bildschirmarbeit",
  SONSTIG: "Sonstig",
};

interface TrainingItem {
  id: string;
  title: string;
  trainingType: string;
  status: string;
  trainingDate: string | null;
  instructor: string | null;
  location: string | null;
  legalBasis: string | null;
  nextDueDate: string | null;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  _count: { participants: number };
}

interface TrainingListFilterProps {
  trainings: TrainingItem[];
}

export function TrainingListFilter({ trainings }: TrainingListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return trainings.filter((t) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(searchLower) ||
        (t.instructor && t.instructor.toLowerCase().includes(searchLower)) ||
        t.company.name.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;

      const matchesType =
        typeFilter === "all" || t.trainingType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [trainings, search, statusFilter, typeFilter]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
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
            placeholder="Titel, Referent, Betrieb..."
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
          <SelectTrigger className="w-[200px]">
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
          filtered.map((training) => (
            <Link
              key={training.id}
              href={`/schulungen/${training.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {training.title}
                        <Badge variant="outline" className="ml-2 font-normal">
                          {typeLabels[training.trainingType] || training.trainingType}
                        </Badge>
                      </CardTitle>
                      {training.legalBasis && (
                        <CardDescription className="mt-1">
                          <BookOpen className="inline h-3 w-3 mr-1" />
                          {training.legalBasis}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={statusColors[training.status]}>
                      {statusLabels[training.status] || training.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{training.company.name}</span>
                    {training.trainingDate && (
                      <span>{formatDate(training.trainingDate)}</span>
                    )}
                    {training.instructor && (
                      <span>Referent: {training.instructor}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {training._count.participants}
                    </span>
                    {training.nextDueDate && (
                      <span
                        className={
                          isOverdue(training.nextDueDate)
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        Fällig: {formatDate(training.nextDueDate)}
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
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Keine Schulungen für diese Filter gefunden."
                  : "Noch keine Schulungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
