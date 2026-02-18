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

const typeLabels: Record<string, string> = {
  activity: "Tätigkeitsbezogen",
  workplace: "Arbeitsplatzbezogen",
  substance: "Gefahrstoffbezogen",
  machine: "Maschinenbezogen",
  psyche: "Psychische Belastungen",
};

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  review_needed: "Überprüfung nötig",
  archived: "Archiviert",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  review_needed: "destructive",
  archived: "outline",
};

interface Assessment {
  id: string;
  title: string;
  assessmentType: string;
  status: string;
  assessmentDate: string | null;
  assessedArea: string | null;
  company: { id: string; name: string };
  assessedBy: { firstName: string; lastName: string } | null;
  _count: { hazards: number };
}

interface AssessmentListFilterProps {
  assessments: Assessment[];
}

export function AssessmentListFilter({ assessments }: AssessmentListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      const matchesSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.company.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.assessedArea?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;

      const matchesType =
        typeFilter === "all" || a.assessmentType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [assessments, search, statusFilter, typeFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel, Betrieb, Bereich..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusLabels)
              .filter(([key]) => key !== "archived")
              .map(([value, label]) => (
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
          filtered.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/gefaehrdungsbeurteilungen/${assessment.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {assessment.title}
                      </CardTitle>
                      <CardDescription>
                        {assessment.company.name} &middot;{" "}
                        {typeLabels[assessment.assessmentType] ||
                          assessment.assessmentType}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[assessment.status]}>
                      {statusLabels[assessment.status] || assessment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {assessment.assessmentDate && (
                      <span>
                        {new Date(assessment.assessmentDate).toLocaleDateString(
                          "de-DE"
                        )}
                      </span>
                    )}
                    {assessment.assessedBy && (
                      <span>
                        {assessment.assessedBy.firstName}{" "}
                        {assessment.assessedBy.lastName}
                      </span>
                    )}
                    <span>
                      {assessment._count.hazards} Gefährdungen
                    </span>
                    {assessment.assessedArea && (
                      <span>{assessment.assessedArea}</span>
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
                  ? "Keine Gefährdungsbeurteilungen für diese Filter gefunden."
                  : "Noch keine Gefährdungsbeurteilungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
