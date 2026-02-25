"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BEANTRAGT: "Beantragt",
  BEWERTET: "Bewertet",
  GENEHMIGT: "Genehmigt",
  UMGESETZT: "Umgesetzt",
  ABGELEHNT: "Abgelehnt",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BEANTRAGT: "secondary",
  BEWERTET: "outline",
  GENEHMIGT: "default",
  UMGESETZT: "outline",
  ABGELEHNT: "destructive",
};

const statusExtraClasses: Record<string, string> = {
  UMGESETZT: "border-green-500 text-green-700",
};

const changeTypeLabels: Record<string, string> = {
  PROZESS: "Prozessänderung",
  ARBEITSPLATZ: "Arbeitsplatzänderung",
  MATERIAL: "Materialänderung",
  ORGANISATION: "Organisationsänderung",
  SONSTIG: "Sonstige",
};

interface ChangeRequestItem {
  id: string;
  changeNumber: string | null;
  title: string;
  changeType: string;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  requestedBy: { firstName: string; lastName: string } | null;
  approvedBy: { firstName: string; lastName: string } | null;
}

interface ChangeRequestListFilterProps {
  changeRequests: ChangeRequestItem[];
}

export function ChangeRequestListFilter({ changeRequests }: ChangeRequestListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return changeRequests.filter((cr) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (cr.changeNumber || "").toLowerCase().includes(searchLower) ||
        cr.title.toLowerCase().includes(searchLower) ||
        cr.company.name.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || cr.status === statusFilter;

      const matchesType =
        changeTypeFilter === "all" || cr.changeType === changeTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [changeRequests, search, statusFilter, changeTypeFilter]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nr., Titel, Betrieb..."
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
        <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(changeTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild className="sm:ml-auto">
          <Link href="/aenderungsmanagement/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Änderungsantrag
          </Link>
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((cr) => (
            <Link
              key={cr.id}
              href={`/aenderungsmanagement/${cr.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {cr.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {cr.changeNumber && (
                          <span>{cr.changeNumber}</span>
                        )}
                        <Badge variant="outline">
                          {changeTypeLabels[cr.changeType] || cr.changeType}
                        </Badge>
                        <span>{cr.company.name}</span>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={statusVariants[cr.status] || "secondary"}
                      className={statusExtraClasses[cr.status] || ""}
                    >
                      {statusLabels[cr.status] || cr.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {cr.requestedBy && (
                      <span>
                        Beantragt von: {cr.requestedBy.firstName}{" "}
                        {cr.requestedBy.lastName}
                      </span>
                    )}
                    <span>
                      {new Date(cr.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
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
                {search || statusFilter !== "all" || changeTypeFilter !== "all"
                  ? "Keine Änderungsanträge für diese Filter gefunden."
                  : "Noch keine Änderungsanträge vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
