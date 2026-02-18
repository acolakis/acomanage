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

const ghsLabels: Record<string, string> = {
  GHS01: "Explodierende Bombe",
  GHS02: "Flamme",
  GHS03: "Flamme über Kreis",
  GHS04: "Gasflasche",
  GHS05: "Ätzwirkung",
  GHS06: "Totenkopf",
  GHS07: "Ausrufezeichen",
  GHS08: "Gesundheitsgefahr",
  GHS09: "Umwelt",
};

interface Substance {
  id: string;
  lfdNr: number;
  tradeName: string;
  manufacturer: string | null;
  casNumber: string | null;
  ghsPictograms: string[];
  signalWord: string | null;
  usageLocation: string | null;
  companyId: string;
  company: { id: string; name: string };
}

interface SubstanceListFilterProps {
  substances: Substance[];
  companies: { id: string; name: string; count: number }[];
}

export function SubstanceListFilter({ substances, companies }: SubstanceListFilterProps) {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [signalWordFilter, setSignalWordFilter] = useState("all");

  const filtered = useMemo(() => {
    return substances.filter((s) => {
      const matchesSearch =
        !search ||
        s.tradeName.toLowerCase().includes(search.toLowerCase()) ||
        (s.manufacturer?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (s.casNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesCompany =
        companyFilter === "all" || s.companyId === companyFilter;

      const matchesSignalWord =
        signalWordFilter === "all" ||
        (signalWordFilter === "Gefahr" && s.signalWord === "Gefahr") ||
        (signalWordFilter === "Achtung" && s.signalWord === "Achtung") ||
        (signalWordFilter === "none" && !s.signalWord);

      return matchesSearch && matchesCompany && matchesSignalWord;
    });
  }, [substances, search, companyFilter, signalWordFilter]);

  // Group by company
  const grouped: Record<string, { companyName: string; substances: Substance[] }> = {};
  for (const s of filtered) {
    if (!grouped[s.companyId]) {
      grouped[s.companyId] = { companyName: s.company.name, substances: [] };
    }
    grouped[s.companyId].substances.push(s);
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
            placeholder="Handelsname, Hersteller, CAS..."
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
        <Select value={signalWordFilter} onValueChange={setSignalWordFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Signalwörter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Signalwörter</SelectItem>
            <SelectItem value="Gefahr">Gefahr</SelectItem>
            <SelectItem value="Achtung">Achtung</SelectItem>
            <SelectItem value="none">Ohne Signalwort</SelectItem>
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
              <CardDescription>
                {data.substances.length} Gefahrstoffe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium">Nr.</th>
                      <th className="pb-2 pr-4 font-medium">Handelsname</th>
                      <th className="pb-2 pr-4 font-medium">Hersteller</th>
                      <th className="pb-2 pr-4 font-medium">CAS-Nr.</th>
                      <th className="pb-2 pr-4 font-medium">GHS</th>
                      <th className="pb-2 pr-4 font-medium">Signalwort</th>
                      <th className="pb-2 pr-4 font-medium">Einsatzort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.substances.map((substance) => (
                      <tr
                        key={substance.id}
                        className="border-b last:border-0 hover:bg-accent/50"
                      >
                        <td className="py-2 pr-4 text-muted-foreground">
                          {substance.lfdNr}
                        </td>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/gefahrstoffe/${substance.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {substance.tradeName}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {substance.manufacturer || "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">
                          {substance.casNumber || "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-1 flex-wrap">
                            {substance.ghsPictograms.map((ghs) => (
                              <Badge
                                key={ghs}
                                variant="outline"
                                className="text-xs"
                                title={ghsLabels[ghs] || ghs}
                              >
                                {ghs}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {substance.signalWord ? (
                            <Badge
                              variant={
                                substance.signalWord === "Gefahr"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {substance.signalWord}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {substance.usageLocation || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {search || companyFilter !== "all" || signalWordFilter !== "all"
                ? "Keine Gefahrstoffe für diese Filter gefunden."
                : "Noch keine Gefahrstoffe erfasst."}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
