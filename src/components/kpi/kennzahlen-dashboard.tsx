"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  formula: string | null;
  isoClause: string | null;
  isAutomatic: boolean;
  targetDirection: string | null;
  sortOrder: number;
  createdAt: string;
}

interface KpiValue {
  id: string;
  kpiId: string;
  companyId: string;
  period: string;
  value: number;
  target: number | null;
  notes: string | null;
  recordedById: string | null;
  createdAt: string;
  kpi: {
    id: string;
    code: string;
    name: string;
    unit: string | null;
    targetDirection: string | null;
    isoClause: string | null;
  };
  company: { id: string; name: string };
  recordedBy: { firstName: string; lastName: string } | null;
}

interface Company {
  id: string;
  name: string;
}

interface KennzahlenDashboardProps {
  kpiDefinitions: KpiDefinition[];
  kpiValues: KpiValue[];
  companies: Company[];
}

function generatePeriodOptions(): { value: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const options: { value: string; label: string }[] = [];

  for (let i = 0; i < 5; i++) {
    let q = currentQuarter - i;
    let y = currentYear;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    const value = `${y}-Q${q}`;
    const label = `Q${q} ${y}`;
    options.push({ value, label });
  }

  return options;
}

function getPreviousPeriod(period: string): string | null {
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (!match) return null;
  let year = parseInt(match[1]);
  let quarter = parseInt(match[2]) - 1;
  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }
  return `${year}-Q${quarter}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number, unit: string | null): string {
  if (unit === "%") {
    return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  }
  if (unit === "Tage" || unit === "Stunden") {
    return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${unit}`;
  }
  return value.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export function KennzahlenDashboard({
  kpiDefinitions,
  kpiValues,
  companies,
}: KennzahlenDashboardProps) {
  const router = useRouter();
  const [selectedKpiId, setSelectedKpiId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const periodOptions = useMemo(() => generatePeriodOptions(), []);

  // Build a map of latest values per KPI (across all companies or for the filtered set)
  const latestValuesMap = useMemo(() => {
    const map = new Map<string, KpiValue>();
    // kpiValues is already ordered by period desc, so first occurrence per kpiId is the latest
    for (const v of kpiValues) {
      if (!map.has(v.kpiId)) {
        map.set(v.kpiId, v);
      }
    }
    return map;
  }, [kpiValues]);

  // Build a map of previous-period values per KPI
  const previousValuesMap = useMemo(() => {
    const map = new Map<string, KpiValue>();
    Array.from(latestValuesMap.entries()).forEach(([kpiId, latestVal]) => {
      const prevPeriod = getPreviousPeriod(latestVal.period);
      if (!prevPeriod) return;
      const prevVal = kpiValues.find(
        (v) => v.kpiId === kpiId && v.period === prevPeriod
      );
      if (prevVal) {
        map.set(kpiId, prevVal);
      }
    });
    return map;
  }, [kpiValues, latestValuesMap]);

  function getTrendInfo(def: KpiDefinition) {
    const latest = latestValuesMap.get(def.id);
    const previous = previousValuesMap.get(def.id);
    if (!latest || !previous) return null;

    const diff = latest.value - previous.value;
    if (diff === 0) return { direction: "neutral" as const, isGood: true };

    const isUp = diff > 0;
    const lowerIsBetter = def.targetDirection === "lower_is_better";
    const isGood = lowerIsBetter ? !isUp : isUp;

    return {
      direction: isUp ? ("up" as const) : ("down" as const),
      isGood,
    };
  }

  function getTargetProgress(latest: KpiValue): number | null {
    if (latest.target === null || latest.target === 0) return null;
    const ratio = (latest.value / latest.target) * 100;
    return Math.min(Math.max(ratio, 0), 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!selectedKpiId || !selectedCompanyId || !selectedPeriod || !formValue) {
      setSubmitError("Bitte alle Pflichtfelder ausfuellen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kpis/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpiId: selectedKpiId,
          companyId: selectedCompanyId,
          period: selectedPeriod,
          value: formValue,
          target: formTarget || null,
          notes: formNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || "Fehler beim Speichern");
        return;
      }

      // Reset form
      setSelectedKpiId("");
      setSelectedCompanyId("");
      setSelectedPeriod("");
      setFormValue("");
      setFormTarget("");
      setFormNotes("");
      router.refresh();
    } catch {
      setSubmitError("Netzwerkfehler beim Speichern");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      {kpiDefinitions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kpiDefinitions.map((def) => {
            const latest = latestValuesMap.get(def.id);
            const trend = getTrendInfo(def);
            const progress = latest ? getTargetProgress(latest) : null;

            return (
              <Card key={def.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {def.name}
                      {def.unit && (
                        <span className="ml-1 text-xs">({def.unit})</span>
                      )}
                    </CardTitle>
                    {def.isoClause && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {def.isoClause}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latest ? (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">
                          {formatValue(latest.value, def.unit)}
                        </span>
                        {trend && trend.direction !== "neutral" && (
                          <span
                            className={`flex items-center text-sm font-medium ${
                              trend.isGood
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {trend.direction === "up" ? (
                              trend.isGood ? (
                                <TrendingUp className="h-4 w-4 mr-0.5" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 mr-0.5" />
                              )
                            ) : trend.isGood ? (
                              <TrendingDown className="h-4 w-4 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 mr-0.5" />
                            )}
                          </span>
                        )}
                        {trend && trend.direction === "neutral" && (
                          <span className="flex items-center text-sm text-muted-foreground">
                            <Minus className="h-4 w-4" />
                          </span>
                        )}
                      </div>

                      {latest.target !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Ziel: {formatValue(latest.target, def.unit)}</span>
                            {progress !== null && (
                              <span>{Math.round(progress)} %</span>
                            )}
                          </div>
                          {progress !== null && (
                            <Progress
                              value={progress}
                              className="h-2"
                            />
                          )}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Periode: {latest.period}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Noch keine Werte erfasst
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Keine Kennzahlen definiert. Bitte erstellen Sie zuerst
              KPI-Definitionen in der Datenbank.
            </p>
          </CardContent>
        </Card>
      )}

      {/* New Value Form */}
      {kpiDefinitions.length > 0 && companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuen Kennzahlen-Wert erfassen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="kpi-select">Kennzahl *</Label>
                  <Select
                    value={selectedKpiId}
                    onValueChange={setSelectedKpiId}
                  >
                    <SelectTrigger id="kpi-select">
                      <SelectValue placeholder="Kennzahl wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {kpiDefinitions.map((def) => (
                        <SelectItem key={def.id} value={def.id}>
                          {def.code} - {def.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-select">Betrieb *</Label>
                  <Select
                    value={selectedCompanyId}
                    onValueChange={setSelectedCompanyId}
                  >
                    <SelectTrigger id="company-select">
                      <SelectValue placeholder="Betrieb wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period-select">Periode *</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger id="period-select">
                      <SelectValue placeholder="Periode wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi-value">Wert *</Label>
                  <Input
                    id="kpi-value"
                    type="number"
                    step="any"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="z.B. 2.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi-target">Ziel (optional)</Label>
                  <Input
                    id="kpi-target"
                    type="number"
                    step="any"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="z.B. 2.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi-notes">Notiz (optional)</Label>
                <Textarea
                  id="kpi-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Zusätzliche Informationen zum erfassten Wert..."
                  rows={2}
                />
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Speichern..." : "Wert erfassen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Values Table */}
      {kpiValues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Erfasste Werte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kennzahl</TableHead>
                    <TableHead>Betrieb</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                    <TableHead className="text-right">Ziel</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Erfasst von</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiValues.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {v.kpi.code} - {v.kpi.name}
                      </TableCell>
                      <TableCell>{v.company.name}</TableCell>
                      <TableCell>{v.period}</TableCell>
                      <TableCell className="text-right">
                        {formatValue(v.value, v.kpi.unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.target !== null
                          ? formatValue(v.target, v.kpi.unit)
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {v.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {v.recordedBy
                          ? `${v.recordedBy.firstName} ${v.recordedBy.lastName}`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatDate(v.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
