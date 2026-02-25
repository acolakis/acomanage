"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ClipboardList, Calendar } from "lucide-react";
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
  BRAND: "Brand",
  CHEMIE: "Chemieunfall",
  UNFALL: "Arbeitsunfall",
  EVAKUIERUNG: "Evakuierung",
  NATURKATASTROPHE: "Naturkatastrophe",
  STROMAUSFALL: "Stromausfall",
  SONSTIG: "Sonstig",
};

const typeColors: Record<string, string> = {
  BRAND: "bg-red-100 text-red-800 border-red-300",
  CHEMIE: "bg-purple-100 text-purple-800 border-purple-300",
  UNFALL: "bg-orange-100 text-orange-800 border-orange-300",
  EVAKUIERUNG: "bg-blue-100 text-blue-800 border-blue-300",
  NATURKATASTROPHE: "bg-amber-100 text-amber-800 border-amber-300",
  STROMAUSFALL: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SONSTIG: "bg-gray-100 text-gray-800 border-gray-300",
};

interface EmergencyPlan {
  id: string;
  title: string;
  emergencyType: string;
  description: string | null;
  isActive: boolean;
  version: number;
  lastDrillDate: string | null;
  nextDrillDate: string | null;
  createdAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  _count: { drills: number };
}

interface NotfallplanListFilterProps {
  plans: EmergencyPlan[];
}

export function NotfallplanListFilter({ plans }: NotfallplanListFilterProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        p.company.name.toLowerCase().includes(searchLower);

      const matchesType =
        typeFilter === "all" || p.emergencyType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [plans, search, typeFilter]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
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
            placeholder="Titel, Beschreibung, Betrieb..."
            className="pl-9"
          />
        </div>
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
          filtered.map((plan) => (
            <Link
              key={plan.id}
              href={`/notfallplanung/${plan.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {plan.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {plan.description
                          ? plan.description.length > 120
                            ? plan.description.slice(0, 120) + "..."
                            : plan.description
                          : "Keine Beschreibung"}
                      </CardDescription>
                    </div>
                    <Badge className={typeColors[plan.emergencyType]}>
                      {typeLabels[plan.emergencyType] || plan.emergencyType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{plan.company.name}</span>
                    <span>Version {plan.version}</span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" />
                      {plan._count.drills} {plan._count.drills === 1 ? "Übung" : "Übungen"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Letzte Übung: {formatDate(plan.lastDrillDate)}
                    </span>
                    {plan.nextDrillDate && (
                      <span
                        className={
                          isOverdue(plan.nextDrillDate)
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        Nächste: {formatDate(plan.nextDrillDate)}
                        {isOverdue(plan.nextDrillDate) && " (überfällig)"}
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
                {search || typeFilter !== "all"
                  ? "Keine Notfallpläne für diese Filter gefunden."
                  : "Noch keine Notfallpläne vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
