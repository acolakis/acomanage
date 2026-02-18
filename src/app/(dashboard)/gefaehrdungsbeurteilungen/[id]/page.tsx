"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  ShieldAlert,
  FileDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Hazard {
  id: string;
  hazardNumber: number;
  hazardFactor: string;
  hazardCategory: string | null;
  description: string | null;
  probability: number | null;
  severity: number | null;
  riskLevel: string | null;
  measure: string | null;
  measureType: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  effectivenessCheck: string | null;
}

interface AssessmentData {
  id: string;
  title: string;
  assessmentType: string;
  legalBasis: string | null;
  assessedArea: string | null;
  status: string;
  version: number;
  assessmentDate: string | null;
  nextReviewDate: string | null;
  company: { id: string; name: string };
  assessedBy: { firstName: string; lastName: string } | null;
  hazards: Hazard[];
}

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

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

const riskColors: Record<string, string> = {
  NIEDRIG: "bg-green-100 text-green-800",
  MITTEL: "bg-yellow-100 text-yellow-800",
  HOCH: "bg-orange-100 text-orange-800",
  KRITISCH: "bg-red-100 text-red-800",
};

const measureTypeLabels: Record<string, string> = {
  T: "Technisch",
  O: "Organisatorisch",
  P: "Persönlich",
};

function getRiskColor(p: number, s: number): string {
  const risk = p * s;
  if (risk >= 16) return "bg-red-500 text-white";
  if (risk >= 10) return "bg-orange-500 text-white";
  if (risk >= 5) return "bg-yellow-400 text-black";
  return "bg-green-500 text-white";
}

export default function GbuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hazardDialogOpen, setHazardDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [newHazard, setNewHazard] = useState({
    hazardFactor: "",
    hazardCategory: "",
    description: "",
    probability: 0,
    severity: 0,
    measure: "",
    measureType: "",
    responsible: "",
    deadline: "",
  });

  const fetchAssessment = useCallback(async () => {
    try {
      const res = await fetch(`/api/risk-assessments/${params.id}`);
      if (!res.ok) throw new Error("Nicht gefunden");
      setAssessment(await res.json());
    } catch {
      router.push("/gefaehrdungsbeurteilungen");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const handleAddHazard = async () => {
    if (!newHazard.hazardFactor) return;
    try {
      const res = await fetch(
        `/api/risk-assessments/${params.id}/hazards`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newHazard,
            probability: newHazard.probability || null,
            severity: newHazard.severity || null,
            measureType: newHazard.measureType || null,
          }),
        }
      );
      if (res.ok) {
        setHazardDialogOpen(false);
        setNewHazard({
          hazardFactor: "",
          hazardCategory: "",
          description: "",
          probability: 0,
          severity: 0,
          measure: "",
          measureType: "",
          responsible: "",
          deadline: "",
        });
        fetchAssessment();
      }
    } catch (error) {
      console.error("Error adding hazard:", error);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(`/api/risk-assessments/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchAssessment();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/risk-assessments/${params.id}/pdf`);
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GBU_${assessment?.title || "Beurteilung"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Fehler beim Generieren des PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading || !assessment) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEditable = assessment.status === "draft" || assessment.status === "review_needed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gefaehrdungsbeurteilungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {assessment.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{assessment.company.name}</span>
            <Badge variant="outline">
              {typeLabels[assessment.assessmentType]}
            </Badge>
            <Badge>{statusLabels[assessment.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
          {isEditable && (
            <Button onClick={() => handleStatusChange("active")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Freigeben
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{assessment.hazards.length}</p>
            <p className="text-xs text-muted-foreground">Gefährdungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">
              {assessment.hazards.filter(
                (h) => h.riskLevel === "KRITISCH" || h.riskLevel === "HOCH"
              ).length}
            </p>
            <p className="text-xs text-muted-foreground">Hoch/Kritisch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">
              {assessment.hazards.filter((h) => h.status === "open").length}
            </p>
            <p className="text-xs text-muted-foreground">Offene Maßnahmen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">
              {assessment.hazards.filter((h) => h.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Erledigt</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hazards">
        <TabsList>
          <TabsTrigger value="hazards">
            Gefährdungen ({assessment.hazards.length})
          </TabsTrigger>
          <TabsTrigger value="matrix">Risikomatrix</TabsTrigger>
          <TabsTrigger value="info">Informationen</TabsTrigger>
        </TabsList>

        {/* Hazards Tab */}
        <TabsContent value="hazards" className="space-y-4 mt-4">
          {assessment.hazards.map((hazard) => (
            <Card key={hazard.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">#{hazard.hazardNumber}</Badge>
                      {hazard.riskLevel && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            riskColors[hazard.riskLevel] || ""
                          }`}
                        >
                          {riskLabels[hazard.riskLevel]}
                        </span>
                      )}
                      {hazard.measureType && (
                        <Badge variant="secondary">
                          {measureTypeLabels[hazard.measureType]}
                        </Badge>
                      )}
                      {hazard.hazardCategory && (
                        <Badge variant="outline" className="text-xs">
                          {hazard.hazardCategory}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">
                      {hazard.hazardFactor}
                    </p>
                    {hazard.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {hazard.description}
                      </p>
                    )}
                    {hazard.measure && (
                      <p className="text-sm mt-2">
                        <span className="font-medium">Maßnahme:</span>{" "}
                        {hazard.measure}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {hazard.probability && hazard.severity && (
                        <span>
                          W: {hazard.probability} × S: {hazard.severity} ={" "}
                          {hazard.probability * hazard.severity}
                        </span>
                      )}
                      {hazard.responsible && (
                        <span>Verantwortlich: {hazard.responsible}</span>
                      )}
                      {hazard.deadline && (
                        <span>
                          Frist:{" "}
                          {new Date(hazard.deadline).toLocaleDateString("de-DE")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {isEditable && (
            <Button
              variant="outline"
              onClick={() => setHazardDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Gefährdung hinzufügen
            </Button>
          )}
        </TabsContent>

        {/* Risk Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Risikomatrix (5×5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full max-w-lg mx-auto">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs text-muted-foreground"></th>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <th key={s} className="p-2 text-xs text-center">
                          S={s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[5, 4, 3, 2, 1].map((p) => (
                      <tr key={p}>
                        <td className="p-2 text-xs text-muted-foreground text-right">
                          W={p}
                        </td>
                        {[1, 2, 3, 4, 5].map((s) => {
                          const hazardsInCell = assessment.hazards.filter(
                            (h) => h.probability === p && h.severity === s
                          );
                          return (
                            <td key={s} className="p-1">
                              <div
                                className={`rounded-md p-2 text-center min-h-[40px] flex items-center justify-center ${getRiskColor(
                                  p,
                                  s
                                )} ${
                                  hazardsInCell.length > 0
                                    ? "ring-2 ring-offset-1 ring-black"
                                    : "opacity-60"
                                }`}
                              >
                                <span className="text-xs font-bold">
                                  {hazardsInCell.length > 0
                                    ? hazardsInCell
                                        .map((h) => `#${h.hazardNumber}`)
                                        .join(", ")
                                    : p * s}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex gap-4 justify-center mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>1-4 Niedrig</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-400" />
                  <span>5-9 Mittel</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>10-15 Hoch</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>16-25 Kritisch</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                W = Wahrscheinlichkeit, S = Schwere
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Betrieb</p>
                  <p className="text-muted-foreground">{assessment.company.name}</p>
                </div>
                <div>
                  <p className="font-medium">Art</p>
                  <p className="text-muted-foreground">
                    {typeLabels[assessment.assessmentType]}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Beurteilter Bereich</p>
                  <p className="text-muted-foreground">
                    {assessment.assessedArea || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Datum</p>
                  <p className="text-muted-foreground">
                    {assessment.assessmentDate
                      ? new Date(assessment.assessmentDate).toLocaleDateString("de-DE")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Nächste Überprüfung</p>
                  <p className="text-muted-foreground">
                    {assessment.nextReviewDate
                      ? new Date(assessment.nextReviewDate).toLocaleDateString("de-DE")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Version</p>
                  <p className="text-muted-foreground">{assessment.version}</p>
                </div>
              </div>
              {assessment.legalBasis && (
                <div>
                  <p className="font-medium">Rechtsgrundlage</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {assessment.legalBasis}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Hazard Dialog */}
      <Dialog open={hazardDialogOpen} onOpenChange={setHazardDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gefährdung hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Gefährdungsfaktor <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newHazard.hazardFactor}
                onChange={(e) =>
                  setNewHazard({ ...newHazard, hazardFactor: e.target.value })
                }
                placeholder="z.B. Mechanische Gefährdung, Gefahrstoffe..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Input
                  value={newHazard.hazardCategory}
                  onChange={(e) =>
                    setNewHazard({ ...newHazard, hazardCategory: e.target.value })
                  }
                  placeholder="z.B. Quetschen, Schneiden..."
                />
              </div>
              <div className="space-y-2">
                <Label>Maßnahmentyp</Label>
                <Select
                  value={newHazard.measureType || "__none__"}
                  onValueChange={(v) =>
                    setNewHazard({ ...newHazard, measureType: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="TOP-Prinzip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keine Angabe</SelectItem>
                    <SelectItem value="T">T - Technisch</SelectItem>
                    <SelectItem value="O">O - Organisatorisch</SelectItem>
                    <SelectItem value="P">P - Persönlich (PSA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={newHazard.description}
                onChange={(e) =>
                  setNewHazard({ ...newHazard, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Wahrscheinlichkeit (1-5)</Label>
                <Select
                  value={newHazard.probability.toString()}
                  onValueChange={(v) =>
                    setNewHazard({ ...newHazard, probability: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>
                        {v} -{" "}
                        {
                          ["", "Unwahrscheinlich", "Selten", "Möglich", "Wahrscheinlich", "Sehr wahrscheinlich"][v]
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schwere (1-5)</Label>
                <Select
                  value={newHazard.severity.toString()}
                  onValueChange={(v) =>
                    setNewHazard({ ...newHazard, severity: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>
                        {v} -{" "}
                        {
                          ["", "Gering", "Leicht", "Mittel", "Schwer", "Katastrophal"][v]
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newHazard.probability > 0 && newHazard.severity > 0 && (
              <div className="text-sm">
                Risikozahl: {newHazard.probability * newHazard.severity}{" "}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRiskColor(
                    newHazard.probability,
                    newHazard.severity
                  )}`}
                >
                  {newHazard.probability * newHazard.severity >= 16
                    ? "Kritisch"
                    : newHazard.probability * newHazard.severity >= 10
                    ? "Hoch"
                    : newHazard.probability * newHazard.severity >= 5
                    ? "Mittel"
                    : "Niedrig"}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Maßnahme</Label>
              <Textarea
                value={newHazard.measure}
                onChange={(e) =>
                  setNewHazard({ ...newHazard, measure: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Verantwortlich</Label>
                <Input
                  value={newHazard.responsible}
                  onChange={(e) =>
                    setNewHazard({ ...newHazard, responsible: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={newHazard.deadline}
                  onChange={(e) =>
                    setNewHazard({ ...newHazard, deadline: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHazardDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddHazard}
              disabled={!newHazard.hazardFactor}
            >
              Gefährdung speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
