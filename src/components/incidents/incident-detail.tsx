"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Camera,
  Plus,
  ImageIcon,
  Trash2,
  AlertTriangle,
  ClipboardList,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// -- Label maps --

const typeLabels: Record<string, string> = {
  UNFALL: "Unfall",
  BEINAHEUNFALL: "Beinaheunfall",
  VORFALL: "Vorfall",
  BERUFSKRANKHEIT: "Berufskrankheit",
  ERSTEHILFE: "Erste Hilfe",
};

const severityLabels: Record<string, string> = {
  GERING: "Gering",
  MITTEL: "Mittel",
  SCHWER: "Schwer",
  TOEDLICH: "Tödlich",
};

const severityColors: Record<string, string> = {
  GERING: "bg-green-100 text-green-800 border-green-300",
  MITTEL: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SCHWER: "bg-orange-100 text-orange-800 border-orange-300",
  TOEDLICH: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<string, string> = {
  GEMELDET: "Gemeldet",
  IN_UNTERSUCHUNG: "In Untersuchung",
  MASSNAHMEN: "Ma\u00dfnahmen offen",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusColors: Record<string, string> = {
  GEMELDET: "bg-blue-100 text-blue-800 border-blue-300",
  IN_UNTERSUCHUNG: "bg-yellow-100 text-yellow-800 border-yellow-300",
  MASSNAHMEN: "bg-orange-100 text-orange-800 border-orange-300",
  ABGESCHLOSSEN: "bg-green-100 text-green-800 border-green-300",
};

const rootCauseCategoryLabels: Record<string, string> = {
  MENSCH: "Mensch",
  TECHNIK: "Technik",
  ORGANISATION: "Organisation",
  UMGEBUNG: "Umgebung",
};

const actionStatusLabels: Record<string, string> = {
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  UMGESETZT: "Umgesetzt",
  WIRKSAMKEIT_GEPRUEFT: "Wirksamkeit gepr.",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const actionPriorityLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  SOFORT: "Sofort",
};

// -- Types --

interface IncidentPhoto {
  id: string;
  filePath: string;
  fileName: string | null;
  caption: string | null;
  sortOrder: number;
}

interface CorrectiveAction {
  id: string;
  actionNumber: string | null;
  title: string;
  description: string | null;
  sourceType: string;
  priority: string;
  status: string;
  deadline: string | null;
  completedAt: string | null;
  responsible: { firstName: string; lastName: string } | null;
}

interface IncidentData {
  id: string;
  incidentNumber: string | null;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  incidentTime: string | null;
  location: string | null;
  department: string | null;
  description: string;
  affectedPerson: string | null;
  affectedRole: string | null;
  witnesses: string | null;
  rootCause: string | null;
  rootCauseCategory: string | null;
  contributingFactors: string | null;
  investigatedBy: { firstName: string; lastName: string } | null;
  investigatedAt: string | null;
  injuryType: string | null;
  bodyPart: string | null;
  lostWorkDays: number | null;
  bgReportable: boolean;
  bgReportDate: string | null;
  bgReportNumber: string | null;
  closedAt: string | null;
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
  company: { id: string; name: string; city: string | null };
  photos: IncidentPhoto[];
  actions: CorrectiveAction[];
}

interface IncidentDetailProps {
  incident: IncidentData;
}

export function IncidentDetail({ incident: initialData }: IncidentDetailProps) {
  const router = useRouter();
  const [incident, setIncident] = useState<IncidentData>(initialData);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Investigation form state
  const [investigationForm, setInvestigationForm] = useState({
    status: incident.status,
    rootCause: incident.rootCause || "",
    rootCauseCategory: incident.rootCauseCategory || "",
    contributingFactors: incident.contributingFactors || "",
  });

  // BG form state
  const [bgForm, setBgForm] = useState({
    bgReportable: incident.bgReportable,
    bgReportDate: incident.bgReportDate ? incident.bgReportDate.slice(0, 10) : "",
    bgReportNumber: incident.bgReportNumber || "",
  });

  // New action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [newAction, setNewAction] = useState({
    title: "",
    description: "",
    priority: "MITTEL",
    deadline: "",
  });

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE");
  };

  const refreshIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/incidents/${incident.id}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data);
      }
    } catch (error) {
      console.error("Error refreshing incident:", error);
    }
  }, [incident.id]);

  // -- Investigation save --
  const handleSaveInvestigation = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: investigationForm.status,
          rootCause: investigationForm.rootCause || null,
          rootCauseCategory: investigationForm.rootCauseCategory || null,
          contributingFactors: investigationForm.contributingFactors || null,
        }),
      });
      if (res.ok) {
        await refreshIncident();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving investigation:", error);
      alert("Fehler beim Speichern der Untersuchung");
    } finally {
      setSaving(false);
    }
  };

  // -- BG save --
  const handleSaveBg = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bgReportable: bgForm.bgReportable,
          bgReportDate: bgForm.bgReportDate || null,
          bgReportNumber: bgForm.bgReportNumber || null,
        }),
      });
      if (res.ok) {
        await refreshIncident();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving BG data:", error);
      alert("Fehler beim Speichern der BG-Meldung");
    } finally {
      setSaving(false);
    }
  };

  // -- Photo upload --
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/incidents/${incident.id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await refreshIncident();
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  // -- Delete --
  const handleDelete = async () => {
    if (!confirm("Vorfall wirklich l\u00f6schen? Alle Fotos werden unwiderruflich gel\u00f6scht.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/vorfaelle");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim L\u00f6schen");
      }
    } catch (error) {
      console.error("Error deleting incident:", error);
      alert("Fehler beim L\u00f6schen des Vorfalls");
    } finally {
      setDeleteLoading(false);
    }
  };

  // -- Create action --
  const handleCreateAction = async () => {
    if (!newAction.title) return;
    setActionSaving(true);
    try {
      const res = await fetch("/api/corrective-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: incident.company.id,
          title: newAction.title,
          description: newAction.description || null,
          sourceType: "VORFALL",
          sourceReference: incident.incidentNumber || incident.id,
          priority: newAction.priority,
          deadline: newAction.deadline || null,
          incidentId: incident.id,
        }),
      });
      if (res.ok) {
        setActionDialogOpen(false);
        setNewAction({ title: "", description: "", priority: "MITTEL", deadline: "" });
        await refreshIncident();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Erstellen der Maßnahme");
      }
    } catch (error) {
      console.error("Error creating action:", error);
      alert("Fehler beim Erstellen der Maßnahme");
    } finally {
      setActionSaving(false);
    }
  };

  const showBgCard = incident.incidentType === "UNFALL" || incident.incidentType === "BERUFSKRANKHEIT";
  const showInjuryInfo = incident.incidentType === "UNFALL" || incident.incidentType === "BERUFSKRANKHEIT";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vorfaelle">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {incident.incidentNumber || "Vorfall"}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{incident.company.name}</span>
            <Badge variant="outline">
              {typeLabels[incident.incidentType] || incident.incidentType}
            </Badge>
            <Badge className={severityColors[incident.severity]}>
              {severityLabels[incident.severity] || incident.severity}
            </Badge>
            <Badge className={statusColors[incident.status]}>
              {statusLabels[incident.status] || incident.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {incident.status === "GEMELDET" && (
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
              <AlertTriangle className="h-5 w-5" />
              Basisdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Vorfalltyp</p>
                <p className="text-muted-foreground">
                  {typeLabels[incident.incidentType] || incident.incidentType}
                </p>
              </div>
              <div>
                <p className="font-medium">Schwere</p>
                <p className="text-muted-foreground">
                  {severityLabels[incident.severity] || incident.severity}
                </p>
              </div>
              <div>
                <p className="font-medium">Datum</p>
                <p className="text-muted-foreground">
                  {formatDate(incident.incidentDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Uhrzeit</p>
                <p className="text-muted-foreground">
                  {incident.incidentTime || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Ort</p>
                <p className="text-muted-foreground">
                  {incident.location || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Abteilung</p>
                <p className="text-muted-foreground">
                  {incident.department || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erfasst von</p>
                <p className="text-muted-foreground">
                  {incident.createdBy
                    ? `${incident.createdBy.firstName} ${incident.createdBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erfasst am</p>
                <p className="text-muted-foreground">
                  {formatDate(incident.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">Beschreibung</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                {incident.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Betroffene Person */}
        <Card>
          <CardHeader>
            <CardTitle>Betroffene Person</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Name</p>
                <p className="text-muted-foreground">
                  {incident.affectedPerson || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Rolle</p>
                <p className="text-muted-foreground">
                  {incident.affectedRole || "\u2014"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-medium">Zeugen</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {incident.witnesses || "\u2014"}
                </p>
              </div>
              {showInjuryInfo && (
                <>
                  <div>
                    <p className="font-medium">Verletzungsart</p>
                    <p className="text-muted-foreground">
                      {incident.injuryType || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Körperteil</p>
                    <p className="text-muted-foreground">
                      {incident.bodyPart || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Ausfalltage</p>
                    <p className="text-muted-foreground">
                      {incident.lostWorkDays !== null
                        ? incident.lostWorkDays
                        : "\u2014"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: BG-Meldung (only for UNFALL/BERUFSKRANKHEIT) */}
        {showBgCard && (
          <Card>
            <CardHeader>
              <CardTitle>BG-Meldung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="bgReportable"
                  checked={bgForm.bgReportable}
                  onCheckedChange={(checked) =>
                    setBgForm({ ...bgForm, bgReportable: !!checked })
                  }
                />
                <Label htmlFor="bgReportable" className="text-sm font-medium">
                  Meldepflichtig
                </Label>
              </div>
              {bgForm.bgReportable && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bgReportDate">Meldedatum</Label>
                    <Input
                      id="bgReportDate"
                      type="date"
                      value={bgForm.bgReportDate}
                      onChange={(e) =>
                        setBgForm({ ...bgForm, bgReportDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgReportNumber">Meldenummer</Label>
                    <Input
                      id="bgReportNumber"
                      value={bgForm.bgReportNumber}
                      onChange={(e) =>
                        setBgForm({ ...bgForm, bgReportNumber: e.target.value })
                      }
                      placeholder="BG-Meldenummer"
                    />
                  </div>
                </div>
              )}
              <Button
                size="sm"
                onClick={handleSaveBg}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                BG-Daten speichern
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 4: Untersuchung */}
        <Card>
          <CardHeader>
            <CardTitle>Untersuchung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={investigationForm.status}
                onValueChange={(v) =>
                  setInvestigationForm({ ...investigationForm, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEMELDET">Gemeldet</SelectItem>
                  <SelectItem value="IN_UNTERSUCHUNG">In Untersuchung</SelectItem>
                  <SelectItem value="MASSNAHMEN">Maßnahmen offen</SelectItem>
                  <SelectItem value="ABGESCHLOSSEN">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {incident.investigatedBy && (
              <div className="text-sm">
                <p className="font-medium">Untersucht von</p>
                <p className="text-muted-foreground">
                  {incident.investigatedBy.firstName} {incident.investigatedBy.lastName}
                  {incident.investigatedAt && (
                    <span className="ml-2">
                      am {formatDate(incident.investigatedAt)}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rootCause">Ursachenanalyse</Label>
              <Textarea
                id="rootCause"
                value={investigationForm.rootCause}
                onChange={(e) =>
                  setInvestigationForm({
                    ...investigationForm,
                    rootCause: e.target.value,
                  })
                }
                placeholder="Grundursache beschreiben..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Ursachenkategorie</Label>
              <Select
                value={investigationForm.rootCauseCategory || "__none__"}
                onValueChange={(v) =>
                  setInvestigationForm({
                    ...investigationForm,
                    rootCauseCategory: v === "__none__" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Angabe</SelectItem>
                  {Object.entries(rootCauseCategoryLabels).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributingFactors">Beitragende Faktoren</Label>
              <Textarea
                id="contributingFactors"
                value={investigationForm.contributingFactors}
                onChange={(e) =>
                  setInvestigationForm({
                    ...investigationForm,
                    contributingFactors: e.target.value,
                  })
                }
                placeholder="Weitere beitragende Faktoren..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleSaveInvestigation}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Untersuchung speichern
            </Button>
          </CardContent>
        </Card>

        {/* Card 5: Fotos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incident.photos.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {incident.photos.map((photo) => (
                  <div key={photo.id} className="relative group h-20 w-20">
                    <img
                      src={`/api/uploads/${photo.filePath.replace(/^uploads\//, "")}`}
                      alt={photo.caption || "Foto"}
                      className="h-20 w-20 rounded border object-cover cursor-pointer"
                      onClick={() =>
                        setLightboxPhoto(
                          `/api/uploads/${photo.filePath.replace(/^uploads\//, "")}`
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Noch keine Fotos vorhanden.
              </p>
            )}
            <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-accent/50 transition-colors">
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {photoUploading
                  ? "Wird hochgeladen..."
                  : "Foto aufnehmen oder hochladen"}
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
            </label>
          </CardContent>
        </Card>

        {/* Card 6: Verknüpfte Maßnahmen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Verknüpfte Maßnahmen
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActionDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Maßnahme
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {incident.actions.length > 0 ? (
              <div className="space-y-3">
                {incident.actions.map((action) => (
                  <Link
                    key={action.id}
                    href={`/massnahmen/${action.id}`}
                    className="block"
                  >
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {action.actionNumber || "Ohne Nr."}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {actionPriorityLabels[action.priority] || action.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {actionStatusLabels[action.status] || action.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {action.title}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {action.responsible && (
                              <span>
                                {action.responsible.firstName}{" "}
                                {action.responsible.lastName}
                              </span>
                            )}
                            {action.deadline && (
                              <span>Frist: {formatDate(action.deadline)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Maßnahmen verknüpft.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Maßnahme erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Titel <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newAction.title}
                onChange={(e) =>
                  setNewAction({ ...newAction, title: e.target.value })
                }
                placeholder="Maßnahme beschreiben..."
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={newAction.description}
                onChange={(e) =>
                  setNewAction({ ...newAction, description: e.target.value })
                }
                placeholder="Detaillierte Beschreibung..."
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select
                  value={newAction.priority}
                  onValueChange={(v) =>
                    setNewAction({ ...newAction, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                    <SelectItem value="MITTEL">Mittel</SelectItem>
                    <SelectItem value="HOCH">Hoch</SelectItem>
                    <SelectItem value="SOFORT">Sofort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={newAction.deadline}
                  onChange={(e) =>
                    setNewAction({ ...newAction, deadline: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateAction}
              disabled={!newAction.title || actionSaving}
            >
              {actionSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {actionSaving ? "Wird erstellt..." : "Maßnahme erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      <Dialog
        open={!!lightboxPhoto}
        onOpenChange={() => setLightboxPhoto(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Foto"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
