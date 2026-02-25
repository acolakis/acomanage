"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  FileText,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

// -- Label maps --

const auditTypeLabels: Record<string, string> = {
  SYSTEM: "Systemaudit",
  PROZESS: "Prozessaudit",
  COMPLIANCE: "Complianceaudit",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_DURCHFUEHRUNG: "In Durchführung",
  BERICHT: "Bericht",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusStyles: Record<string, string> = {
  GEPLANT: "bg-slate-100 text-slate-800 border-slate-300",
  IN_DURCHFUEHRUNG: "bg-blue-100 text-blue-800 border-blue-300",
  BERICHT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ABGESCHLOSSEN: "bg-green-100 text-green-800 border-green-300",
};

const findingTypeLabels: Record<string, string> = {
  ABWEICHUNG_SCHWER: "Schwere Abweichung",
  ABWEICHUNG_LEICHT: "Leichte Abweichung",
  VERBESSERUNG: "Verbesserungspotential",
  POSITIV: "Positive Feststellung",
};

const findingTypeStyles: Record<string, string> = {
  ABWEICHUNG_SCHWER: "bg-red-100 text-red-800 border-red-300",
  ABWEICHUNG_LEICHT: "bg-orange-100 text-orange-800 border-orange-300",
  VERBESSERUNG: "bg-blue-100 text-blue-800 border-blue-300",
  POSITIV: "bg-green-100 text-green-800 border-green-300",
};

const actionStatusLabels: Record<string, string> = {
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  UMGESETZT: "Umgesetzt",
  WIRKSAMKEIT_GEPRUEFT: "Wirksamkeit gepr.",
  ABGESCHLOSSEN: "Abgeschlossen",
};

// -- Types --

interface LinkedAction {
  id: string;
  actionNumber: string | null;
  title: string;
  status: string;
  priority: string;
}

interface Finding {
  id: string;
  findingNumber: number;
  findingType: string;
  isoClause: string | null;
  description: string;
  evidence: string | null;
  action: LinkedAction | null;
  createdAt: string;
}

interface AuditData {
  id: string;
  auditNumber: string | null;
  title: string;
  auditType: string;
  isoClause: string | null;
  status: string;
  plannedDate: string | null;
  actualDate: string | null;
  auditorId: string | null;
  auditees: string | null;
  scope: string | null;
  summary: string | null;
  positiveFindings: string | null;
  completedAt: string | null;
  createdAt: string;
  company: { id: string; name: string };
  auditor: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  findings: Finding[];
}

interface AuditDetailProps {
  audit: AuditData;
}

export function AuditDetail({ audit: initialData }: AuditDetailProps) {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditData>(initialData);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Summary form state
  const [summaryForm, setSummaryForm] = useState({
    summary: audit.summary || "",
    positiveFindings: audit.positiveFindings || "",
  });

  // Status form state
  const [statusForm, setStatusForm] = useState(audit.status);

  // New finding form state
  const [findingForm, setFindingForm] = useState({
    findingType: "",
    isoClause: "",
    description: "",
    evidence: "",
    createAction: false,
  });
  const [findingSaving, setFindingSaving] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const refreshAudit = useCallback(async () => {
    try {
      const res = await fetch(`/api/audits/${audit.id}`);
      if (res.ok) {
        const data = await res.json();
        setAudit(data);
      }
    } catch (error) {
      console.error("Error refreshing audit:", error);
    }
  }, [audit.id]);

  // -- Save summary --
  const handleSaveSummary = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summaryForm.summary || null,
          positiveFindings: summaryForm.positiveFindings || null,
        }),
      });
      if (res.ok) {
        await refreshAudit();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving summary:", error);
      alert("Fehler beim Speichern der Zusammenfassung");
    } finally {
      setSaving(false);
    }
  };

  // -- Save status --
  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusForm }),
      });
      if (res.ok) {
        await refreshAudit();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving status:", error);
      alert("Fehler beim Aktualisieren des Status");
    } finally {
      setSaving(false);
    }
  };

  // -- Add finding --
  const handleAddFinding = async () => {
    if (!findingForm.findingType || !findingForm.description) return;
    setFindingSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingType: findingForm.findingType,
          isoClause: findingForm.isoClause || null,
          description: findingForm.description,
          evidence: findingForm.evidence || null,
          createAction: findingForm.createAction,
        }),
      });
      if (res.ok) {
        setFindingForm({
          findingType: "",
          isoClause: "",
          description: "",
          evidence: "",
          createAction: false,
        });
        await refreshAudit();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Erstellen der Feststellung");
      }
    } catch (error) {
      console.error("Error creating finding:", error);
      alert("Fehler beim Erstellen der Feststellung");
    } finally {
      setFindingSaving(false);
    }
  };

  // -- Delete audit --
  const handleDelete = async () => {
    if (!confirm("Audit wirklich löschen? Alle Feststellungen werden ebenfalls gelöscht.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/audits");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting audit:", error);
      alert("Fehler beim Löschen des Audits");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {audit.auditNumber || "Audit"} — {audit.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{audit.company.name}</span>
            <Badge variant="outline">
              {auditTypeLabels[audit.auditType] || audit.auditType}
            </Badge>
            <Badge className={statusStyles[audit.status]}>
              {statusLabels[audit.status] || audit.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/api/audits/${audit.id}/pdf`} target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Link>
          </Button>
          {audit.status === "GEPLANT" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Löschen
            </Button>
          )}
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Basisdaten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Basisdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Titel</p>
                <p className="text-muted-foreground">{audit.title}</p>
              </div>
              <div>
                <p className="font-medium">Audit-Typ</p>
                <p className="text-muted-foreground">
                  {auditTypeLabels[audit.auditType] || audit.auditType}
                </p>
              </div>
              <div>
                <p className="font-medium">ISO-Klausel</p>
                <p className="text-muted-foreground">
                  {audit.isoClause || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Geplant am</p>
                <p className="text-muted-foreground">
                  {formatDate(audit.plannedDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Durchgeführt am</p>
                <p className="text-muted-foreground">
                  {formatDate(audit.actualDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Auditor</p>
                <p className="text-muted-foreground">
                  {audit.auditor
                    ? `${audit.auditor.firstName} ${audit.auditor.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Auditierte Bereiche</p>
                <p className="text-muted-foreground">
                  {audit.auditees || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Geltungsbereich</p>
                <p className="text-muted-foreground">
                  {audit.scope || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt von</p>
                <p className="text-muted-foreground">
                  {audit.createdBy
                    ? `${audit.createdBy.firstName} ${audit.createdBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt am</p>
                <p className="text-muted-foreground">
                  {formatDate(audit.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Zusammenfassung */}
        <Card>
          <CardHeader>
            <CardTitle>Zusammenfassung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Zusammenfassung</Label>
              <Textarea
                id="summary"
                value={summaryForm.summary}
                onChange={(e) =>
                  setSummaryForm({ ...summaryForm, summary: e.target.value })
                }
                placeholder="Gesamtzusammenfassung des Audits..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positiveFindings">Positive Feststellungen</Label>
              <Textarea
                id="positiveFindings"
                value={summaryForm.positiveFindings}
                onChange={(e) =>
                  setSummaryForm({ ...summaryForm, positiveFindings: e.target.value })
                }
                placeholder="Positive Aspekte und gute Praktiken..."
                rows={4}
              />
            </div>
            <Button onClick={handleSaveSummary} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Zusammenfassung speichern
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Feststellungen */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Feststellungen ({audit.findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing findings */}
            {audit.findings.length > 0 && (
              <div className="space-y-3">
                {audit.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-md border p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          #{finding.findingNumber}
                        </span>
                        <Badge className={findingTypeStyles[finding.findingType] || ""}>
                          {findingTypeLabels[finding.findingType] || finding.findingType}
                        </Badge>
                        {finding.isoClause && (
                          <Badge variant="outline" className="text-xs">
                            ISO {finding.isoClause}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(finding.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {finding.description}
                    </p>
                    {finding.evidence && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">Nachweise:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {finding.evidence}
                        </p>
                      </div>
                    )}
                    {finding.action && (
                      <div className="mt-3 rounded border bg-muted/30 p-2">
                        <Link
                          href={`/massnahmen/${finding.action.id}`}
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <ClipboardList className="h-3 w-3" />
                          <span className="font-medium">
                            {finding.action.actionNumber || "Maßnahme"}
                          </span>
                          <span className="text-muted-foreground">
                            {finding.action.title}
                          </span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {actionStatusLabels[finding.action.status] || finding.action.status}
                          </Badge>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {audit.findings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Noch keine Feststellungen vorhanden.
              </p>
            )}

            {/* Add finding form */}
            <div className="rounded-md border border-dashed p-4 space-y-4">
              <p className="text-sm font-medium">Neue Feststellung hinzufügen</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Typ <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={findingForm.findingType || "__none__"}
                    onValueChange={(v) =>
                      setFindingForm({
                        ...findingForm,
                        findingType: v === "__none__" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Bitte wählen</SelectItem>
                      {Object.entries(findingTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ISO-Klausel</Label>
                  <Input
                    value={findingForm.isoClause}
                    onChange={(e) =>
                      setFindingForm({ ...findingForm, isoClause: e.target.value })
                    }
                    placeholder="z.B. 6.1.2, 7.2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Beschreibung <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={findingForm.description}
                  onChange={(e) =>
                    setFindingForm({ ...findingForm, description: e.target.value })
                  }
                  placeholder="Beschreibung der Feststellung..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Nachweise / Belege</Label>
                <Textarea
                  value={findingForm.evidence}
                  onChange={(e) =>
                    setFindingForm({ ...findingForm, evidence: e.target.value })
                  }
                  placeholder="Nachweise, Dokumente, Beobachtungen..."
                  rows={2}
                />
              </div>
              {findingForm.findingType &&
                findingForm.findingType !== "POSITIV" && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="createAction"
                      checked={findingForm.createAction}
                      onCheckedChange={(checked) =>
                        setFindingForm({
                          ...findingForm,
                          createAction: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="createAction" className="text-sm font-medium">
                      Automatisch Korrekturmaßnahme erstellen
                    </Label>
                  </div>
                )}
              <Button
                onClick={handleAddFinding}
                disabled={
                  !findingForm.findingType ||
                  !findingForm.description ||
                  findingSaving
                }
                size="sm"
              >
                {findingSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Feststellung hinzufügen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Status-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle>Status-Verwaltung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusForm} onValueChange={setStatusForm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEPLANT">Geplant</SelectItem>
                  <SelectItem value="IN_DURCHFUEHRUNG">In Durchführung</SelectItem>
                  <SelectItem value="BERICHT">Bericht</SelectItem>
                  <SelectItem value="ABGESCHLOSSEN">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audit.completedAt && (
              <div className="text-sm">
                <p className="font-medium">Abgeschlossen am</p>
                <p className="text-muted-foreground">
                  {formatDate(audit.completedAt)}
                </p>
              </div>
            )}

            <Button
              onClick={handleSaveStatus}
              disabled={saving || statusForm === audit.status}
              size="sm"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Status aktualisieren
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
