"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Calendar } from "lucide-react";
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

const categoryLabels: Record<string, string> = {
  Gesetz: "Gesetz",
  Verordnung: "Verordnung",
  "DGUV Vorschrift": "DGUV Vorschrift",
  "DGUV Regel": "DGUV Regel",
  "DGUV Information": "DGUV Information",
  "DGUV Grundsatz": "DGUV Grundsatz",
  "Technische Regel": "Technische Regel",
  Norm: "Norm",
  Sonstig: "Sonstig",
};

const statusLabels: Record<string, string> = {
  OFFEN: "Offen",
  KONFORM: "Konform",
  TEILWEISE: "Teilweise",
  NICHT_KONFORM: "Nicht konform",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OFFEN: "secondary",
  KONFORM: "outline",
  TEILWEISE: "default",
  NICHT_KONFORM: "destructive",
};

const statusExtraClass: Record<string, string> = {
  KONFORM: "border-green-500 text-green-700",
  TEILWEISE: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100/80",
};

interface LegalRequirement {
  id: string;
  title: string;
  shortTitle: string | null;
  category: string;
  section: string | null;
  description: string | null;
  relevance: string | null;
  complianceStatus: string;
  complianceNotes: string | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  sourceUrl: string | null;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
}

interface LegalListFilterProps {
  requirements: LegalRequirement[];
}

export function LegalListFilter({ requirements }: LegalListFilterProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.title.toLowerCase().includes(searchLower) ||
        (r.shortTitle && r.shortTitle.toLowerCase().includes(searchLower)) ||
        (r.description && r.description.toLowerCase().includes(searchLower));

      const matchesCategory =
        categoryFilter === "all" || r.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || r.complianceStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [requirements, search, categoryFilter, statusFilter]);

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
            placeholder="Titel, Kurzbezeichnung, Beschreibung..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          filtered.map((req) => (
            <Link
              key={req.id}
              href={`/rechtskataster/${req.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {req.title}
                        {req.shortTitle && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({req.shortTitle})
                          </span>
                        )}
                      </CardTitle>
                      {req.section && (
                        <CardDescription className="mt-1">
                          {req.section}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{req.category}</Badge>
                      <Badge
                        variant={statusVariants[req.complianceStatus] || "secondary"}
                        className={statusExtraClass[req.complianceStatus] || ""}
                      >
                        {statusLabels[req.complianceStatus] || req.complianceStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{req.company.name}</span>
                    {req.relevance && (
                      <span className="truncate max-w-[300px]">
                        {req.relevance}
                      </span>
                    )}
                    {req.nextReviewDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          isOverdue(req.nextReviewDate)
                            ? "text-destructive font-medium"
                            : ""
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatDate(req.nextReviewDate)}
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
                {search || categoryFilter !== "all" || statusFilter !== "all"
                  ? "Keine Anforderungen für diese Filter gefunden."
                  : "Noch keine Rechtsanforderungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
