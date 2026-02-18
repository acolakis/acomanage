"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Building2 } from "lucide-react";
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

interface Machine {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  companyId: string;
  company: { id: string; name: string };
}

interface MachineListFilterProps {
  machines: Machine[];
}

export function MachineListFilter({ machines }: MachineListFilterProps) {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  const companies = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const m of machines) {
      const existing = map.get(m.companyId);
      if (existing) {
        existing.count++;
      } else {
        map.set(m.companyId, { name: m.company.name, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      count: v.count,
    }));
  }, [machines]);

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.manufacturer?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (m.model?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesCompany =
        companyFilter === "all" || m.companyId === companyFilter;

      return matchesSearch && matchesCompany;
    });
  }, [machines, search, companyFilter]);

  // Group by company
  const grouped: Record<string, { companyName: string; machines: Machine[] }> = {};
  for (const m of filtered) {
    if (!grouped[m.companyId]) {
      grouped[m.companyId] = { companyName: m.company.name, machines: [] };
    }
    grouped[m.companyId].machines.push(m);
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, Hersteller, Modell..."
            className="pl-9"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Betriebe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Betriebe</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([companyId, data]) => (
          <Card key={companyId}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {data.companyName}
              </CardTitle>
              <CardDescription>{data.machines.length} Maschinen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.machines.map((m) => (
                  <Link
                    key={m.id}
                    href={`/maschinen/${m.id}`}
                    className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {m.manufacturer && <span>{m.manufacturer}</span>}
                        {m.model && <span>{m.model}</span>}
                        {m.location && <span>- {m.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.serialNumber && (
                        <Badge variant="outline" className="text-xs">
                          S/N: {m.serialNumber}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {search || companyFilter !== "all"
                ? "Keine Maschinen für diese Filter gefunden."
                : "Noch keine Maschinen erfasst."}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
