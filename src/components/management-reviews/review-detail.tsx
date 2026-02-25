"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReviewUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface ReviewData {
  id: string;
  companyId: string;
  reviewNumber: string | null;
  reviewDate: string;
  statusPreviousActions: string | null;
  changesInternalExternal: string | null;
  ohsPerformance: unknown;
  incidentSummary: string | null;
  auditResults: string | null;
  consultationResults: string | null;
  risksOpportunities: string | null;
  objectiveProgress: string | null;
  ohsFitness: string | null;
  improvementNeeds: string | null;
  resourceNeeds: string | null;
  decisions: string | null;
  attendees: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  approvedBy: ReviewUser | null;
  createdBy: ReviewUser | null;
}

interface ReviewDetailProps {
  review: ReviewData;
}

export function ReviewDetail({ review: initialReview }: ReviewDetailProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inputs
  const [statusPreviousActions, setStatusPreviousActions] = useState(
    initialReview.statusPreviousActions || ""
  );
  const [changesInternalExternal, setChangesInternalExternal] = useState(
    initialReview.changesInternalExternal || ""
  );
  const [ohsPerformance, setOhsPerformance] = useState(
    initialReview.ohsPerformance
      ? typeof initialReview.ohsPerformance === "string"
        ? initialReview.ohsPerformance
        : JSON.stringify(initialReview.ohsPerformance, null, 2)
      : ""
  );
  const [incidentSummary, setIncidentSummary] = useState(
    initialReview.incidentSummary || ""
  );
  const [auditResults, setAuditResults] = useState(
    initialReview.auditResults || ""
  );
  const [consultationResults, setConsultationResults] = useState(
    initialReview.consultationResults || ""
  );
  const [risksOpportunities, setRisksOpportunities] = useState(
    initialReview.risksOpportunities || ""
  );
  const [objectiveProgress, setObjectiveProgress] = useState(
    initialReview.objectiveProgress || ""
  );

  // Outputs
  const [ohsFitness, setOhsFitness] = useState(
    initialReview.ohsFitness || ""
  );
  const [improvementNeeds, setImprovementNeeds] = useState(
    initialReview.improvementNeeds || ""
  );
  const [resourceNeeds, setResourceNeeds] = useState(
    initialReview.resourceNeeds || ""
  );
  const [decisions, setDecisions] = useState(initialReview.decisions || "");

  // Meta
  const [attendees, setAttendees] = useState(initialReview.attendees || "");
  const [approvedAt, setApprovedAt] = useState(initialReview.approvedAt);
  const [approvedBy, setApprovedBy] = useState(initialReview.approvedBy);

  const isApproved = approvedAt !== null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let parsedOhsPerformance: unknown = null;
      if (ohsPerformance.trim()) {
        try {
          parsedOhsPerformance = JSON.parse(ohsPerformance);
        } catch {
          parsedOhsPerformance = ohsPerformance;
        }
      }

      const res = await fetch(`/api/management-reviews/${initialReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusPreviousActions: statusPreviousActions || null,
          changesInternalExternal: changesInternalExternal || null,
          ohsPerformance: parsedOhsPerformance,
          incidentSummary: incidentSummary || null,
          auditResults: auditResults || null,
          consultationResults: consultationResults || null,
          risksOpportunities: risksOpportunities || null,
          objectiveProgress: objectiveProgress || null,
          ohsFitness: ohsFitness || null,
          improvementNeeds: improvementNeeds || null,
          resourceNeeds: resourceNeeds || null,
          decisions: decisions || null,
          attendees: attendees || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (
      !confirm(
        "Managementbewertung genehmigen? Diese Aktion kann nicht rückgängig gemacht werden."
      )
    )
      return;

    setApproving(true);
    try {
      const res = await fetch(`/api/management-reviews/${initialReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Genehmigen");
      }

      const updated = await res.json();
      setApprovedAt(updated.approvedAt);
      setApprovedBy(updated.approvedBy);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Fehler beim Genehmigen"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Managementbewertung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/management-reviews/${initialReview.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Löschen");
      }

      router.push("/managementbewertung");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  const handlePdfDownload = () => {
    if (initialReview.pdfPath) {
      window.open(initialReview.pdfPath, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/managementbewertung">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {initialReview.reviewNumber || "Managementbewertung"}
            </h1>
            <Badge variant={isApproved ? "default" : "secondary"}>
              {isApproved ? "Genehmigt" : "Offen"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {initialReview.company.name} &mdash;{" "}
            {new Date(initialReview.reviewDate).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {initialReview.pdfPath && (
            <Button variant="outline" size="sm" onClick={handlePdfDownload}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
          {!isApproved && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Löschen
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* EINGABEN (Inputs) - Clause 9.3 */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Eingaben (Inputs gem. ISO 45001 Klausel 9.3)</CardTitle>
          <CardDescription>
            Informationsgrundlage für die Managementbewertung. Einige Felder
            wurden automatisch vorausgefüllt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="statusPreviousActions">
              a) Status vorheriger Maßnahmen
            </Label>
            <Textarea
              id="statusPreviousActions"
              value={statusPreviousActions}
              onChange={(e) => setStatusPreviousActions(e.target.value)}
              placeholder="Status der Maßnahmen aus vorherigen Managementbewertungen..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="changesInternalExternal">
              b) Änderungen interner/externer Themen
            </Label>
            <Textarea
              id="changesInternalExternal"
              value={changesInternalExternal}
              onChange={(e) => setChangesInternalExternal(e.target.value)}
              placeholder="Änderungen bei internen und externen Themen, die das SGA-System betreffen..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="ohsPerformance">c) SGA-Leistung</Label>
            <Textarea
              id="ohsPerformance"
              value={ohsPerformance}
              onChange={(e) => setOhsPerformance(e.target.value)}
              placeholder="Informationen zur SGA-Leistung, einschließlich Trends bei Kennzahlen, Überwachungsergebnissen..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="incidentSummary">
              d) Zusammenfassung Vorfälle
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatisch aus Vorfalldaten der letzten 12 Monate generiert
            </p>
            <Textarea
              id="incidentSummary"
              value={incidentSummary}
              onChange={(e) => setIncidentSummary(e.target.value)}
              placeholder="Zusammenfassung der Vorfälle, Unfälle und Beinaheunfälle..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="auditResults">e) Auditergebnisse</Label>
            <p className="text-xs text-muted-foreground">
              Automatisch aus internen Audits der letzten 12 Monate generiert
            </p>
            <Textarea
              id="auditResults"
              value={auditResults}
              onChange={(e) => setAuditResults(e.target.value)}
              placeholder="Ergebnisse interner Audits..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="consultationResults">
              f) Ergebnisse der Konsultation und Beteiligung
            </Label>
            <Textarea
              id="consultationResults"
              value={consultationResults}
              onChange={(e) => setConsultationResults(e.target.value)}
              placeholder="Ergebnisse der Konsultation und Beteiligung der Beschäftigten..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="risksOpportunities">g) Risiken und Chancen</Label>
            <Textarea
              id="risksOpportunities"
              value={risksOpportunities}
              onChange={(e) => setRisksOpportunities(e.target.value)}
              placeholder="Aktuelle Risiken und Chancen für das SGA-System..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="objectiveProgress">h) Zielfortschritte</Label>
            <p className="text-xs text-muted-foreground">
              Automatisch aus SGA-Zielen generiert
            </p>
            <Textarea
              id="objectiveProgress"
              value={objectiveProgress}
              onChange={(e) => setObjectiveProgress(e.target.value)}
              placeholder="Fortschritte bei der Erreichung der SGA-Ziele..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* ERGEBNISSE (Outputs) - Clause 9.3 */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle>
            Ergebnisse (Outputs gem. ISO 45001 Klausel 9.3)
          </CardTitle>
          <CardDescription>
            Beschlüsse und Festlegungen der obersten Leitung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ohsFitness">
              Eignung des SGA-Systems
            </Label>
            <Textarea
              id="ohsFitness"
              value={ohsFitness}
              onChange={(e) => setOhsFitness(e.target.value)}
              placeholder="Bewertung der fortdauernden Eignung, Angemessenheit und Wirksamkeit des SGA-Systems..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="improvementNeeds">Verbesserungsbedarf</Label>
            <Textarea
              id="improvementNeeds"
              value={improvementNeeds}
              onChange={(e) => setImprovementNeeds(e.target.value)}
              placeholder="Möglichkeiten zur fortlaufenden Verbesserung des SGA-Systems..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="resourceNeeds">Ressourcenbedarf</Label>
            <Textarea
              id="resourceNeeds"
              value={resourceNeeds}
              onChange={(e) => setResourceNeeds(e.target.value)}
              placeholder="Bedarf an Ressourcen (Personal, Budget, Ausrüstung, Schulungen)..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="decisions">Beschlüsse</Label>
            <Textarea
              id="decisions"
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="Konkrete Beschlüsse und Maßnahmen, die aus der Bewertung resultieren..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* META */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Teilnehmer & Genehmigung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="attendees">Teilnehmer</Label>
            <Textarea
              id="attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Teilnehmer der Managementbewertung..."
              rows={3}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Genehmigung</Label>
            {isApproved ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  Genehmigt von{" "}
                  <span className="font-medium">
                    {approvedBy
                      ? `${approvedBy.firstName} ${approvedBy.lastName}`
                      : "Unbekannt"}
                  </span>{" "}
                  am{" "}
                  {new Date(approvedAt!).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Diese Bewertung wurde noch nicht genehmigt.
                </p>
                <Button
                  variant="outline"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Bewertung genehmigen
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Erstellt von:</span>{" "}
              {initialReview.createdBy
                ? `${initialReview.createdBy.firstName} ${initialReview.createdBy.lastName}`
                : "Unbekannt"}
            </div>
            <div>
              <span className="font-medium text-foreground">Erstellt am:</span>{" "}
              {new Date(initialReview.createdAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" asChild>
          <Link href="/managementbewertung">Zurück zur Übersicht</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Änderungen speichern
        </Button>
      </div>
    </div>
  );
}
