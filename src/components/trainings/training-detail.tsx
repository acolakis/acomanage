"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  FileDown,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  GraduationCap,
  BookOpen,
} from "lucide-react";

import { TrainingSection } from "@/types/training";
import { SectionEditor } from "@/components/trainings/section-editor";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// -- Label maps --

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  DURCHGEFUEHRT: "Durchgeführt",
  ABGESAGT: "Abgesagt",
  UEBERFAELLIG: "Überfällig",
};

const statusColors: Record<string, string> = {
  GEPLANT: "bg-blue-100 text-blue-800 border-blue-300",
  DURCHGEFUEHRT: "bg-green-100 text-green-800 border-green-300",
  ABGESAGT: "bg-red-100 text-red-800 border-red-300",
  UEBERFAELLIG: "bg-orange-100 text-orange-800 border-orange-300",
};

const typeLabels: Record<string, string> = {
  ERSTUNTERWEISUNG: "Erstunterweisung",
  UNTERWEISUNG: "Unterweisung",
  FORTBILDUNG: "Fortbildung",
  ZERTIFIKAT: "Zertifikat",
  ERSTE_HILFE: "Erste Hilfe",
  BRANDSCHUTZ: "Brandschutz",
  GEFAHRSTOFF: "Gefahrstoff",
  PSA: "PSA",
  MASCHINE: "Maschine",
  ELEKTRO: "Elektro",
  HOEHENARBEIT: "Höhenarbeit",
  STAPLERFAHRER: "Staplerfahrer",
  BILDSCHIRMARBEIT: "Bildschirmarbeit",
  SONSTIG: "Sonstig",
};

// -- Types --

interface Participant {
  id: string;
  participantName: string;
  department: string | null;
  attended: boolean;
  signedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface TrainingData {
  id: string;
  title: string;
  trainingType: string;
  status: string;
  description: string | null;
  legalBasis: string | null;
  content: string | null;
  sections: TrainingSection[] | null;
  instructor: string | null;
  location: string | null;
  trainingDate: string | null;
  startTime: string | null;
  duration: number | null;
  recurrenceMonths: number | null;
  nextDueDate: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  company: { id: true; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  template: { id: string; title: string } | null;
  participants: Participant[];
}

interface TrainingDetailProps {
  training: TrainingData;
}

export function TrainingDetail({ training: initialData }: TrainingDetailProps) {
  const [training, setTraining] = useState<TrainingData>(initialData);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Content editing
  const [editingContent, setEditingContent] = useState(false);
  const [contentDraft, setContentDraft] = useState(training.content || "");
  const [sectionsDraft, setSectionsDraft] = useState<TrainingSection[]>(
    Array.isArray(training.sections) ? training.sections : []
  );

  // Status form
  const [statusForm, setStatusForm] = useState({
    status: training.status,
    notes: training.notes || "",
  });

  // Add participant form
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantDept, setNewParticipantDept] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Attendance tracking (local state for batch save)
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of initialData.participants) {
      map[p.id] = p.attended;
    }
    return map;
  });
  const [savingAttendance, setSavingAttendance] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const refreshTraining = useCallback(async () => {
    try {
      const res = await fetch(`/api/trainings/${training.id}`);
      if (res.ok) {
        const data = await res.json();
        setTraining(data);
        // Update attendance state
        const map: Record<string, boolean> = {};
        for (const p of data.participants) {
          map[p.id] = p.attended;
        }
        setAttendance(map);
      }
    } catch (error) {
      console.error("Error refreshing training:", error);
    }
  }, [training.id]);

  // -- PDF download --
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/trainings/${training.id}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Schulungsnachweis_${training.title.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim PDF-Download");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Fehler beim PDF-Download");
    } finally {
      setPdfLoading(false);
    }
  };

  // -- Save status --
  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/trainings/${training.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusForm.status,
          notes: statusForm.notes || null,
        }),
      });
      if (res.ok) {
        await refreshTraining();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving status:", error);
      alert("Fehler beim Speichern des Status");
    } finally {
      setSaving(false);
    }
  };

  // -- Save content --
  const handleSaveContent = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        content: contentDraft || null,
        sections: sectionsDraft.length > 0 ? sectionsDraft : null,
      };
      const res = await fetch(`/api/trainings/${training.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingContent(false);
        await refreshTraining();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Fehler beim Speichern des Inhalts");
    } finally {
      setSaving(false);
    }
  };

  // -- Add participant --
  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) return;
    setAddingParticipant(true);
    try {
      const res = await fetch(`/api/trainings/${training.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: newParticipantName.trim(),
          department: newParticipantDept.trim() || null,
        }),
      });
      if (res.ok) {
        setNewParticipantName("");
        setNewParticipantDept("");
        setShowAddParticipant(false);
        await refreshTraining();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Hinzufügen");
      }
    } catch (error) {
      console.error("Error adding participant:", error);
      alert("Fehler beim Hinzufügen des Teilnehmers");
    } finally {
      setAddingParticipant(false);
    }
  };

  // -- Delete participant --
  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm("Teilnehmer wirklich entfernen?")) return;
    try {
      const res = await fetch(
        `/api/trainings/${training.id}/participants?participantId=${participantId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await refreshTraining();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Entfernen");
      }
    } catch (error) {
      console.error("Error deleting participant:", error);
      alert("Fehler beim Entfernen des Teilnehmers");
    }
  };

  // -- Mark all as attended --
  const handleMarkAllAttended = () => {
    const updated: Record<string, boolean> = {};
    for (const p of training.participants) {
      updated[p.id] = true;
    }
    setAttendance(updated);
  };

  // -- Toggle single attendance --
  const toggleAttendance = (participantId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [participantId]: !prev[participantId],
    }));
  };

  // -- Batch save attendance --
  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const participants = training.participants.map((p) => ({
        id: p.id,
        attended: attendance[p.id] ?? p.attended,
      }));
      const res = await fetch(`/api/trainings/${training.id}/participants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      });
      if (res.ok) {
        await refreshTraining();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Fehler beim Speichern der Teilnahme");
    } finally {
      setSavingAttendance(false);
    }
  };

  const attendedCount = training.participants.filter((p) => p.attended).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/schulungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {training.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{training.company.name}</span>
            <Badge variant="outline">
              {typeLabels[training.trainingType] || training.trainingType}
            </Badge>
            <Badge className={statusColors[training.status]}>
              {statusLabels[training.status] || training.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdfDownload}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            PDF-Download
          </Button>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Schulungsdaten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Schulungsdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Titel</p>
                <p className="text-muted-foreground">{training.title}</p>
              </div>
              <div>
                <p className="font-medium">Typ</p>
                <p className="text-muted-foreground">
                  {typeLabels[training.trainingType] || training.trainingType}
                </p>
              </div>
              <div>
                <p className="font-medium">Betrieb</p>
                <p className="text-muted-foreground">{training.company.name}</p>
              </div>
              <div>
                <p className="font-medium">Rechtsgrundlage</p>
                <p className="text-muted-foreground">
                  {training.legalBasis || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Datum</p>
                <p className="text-muted-foreground">
                  {formatDate(training.trainingDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Uhrzeit</p>
                <p className="text-muted-foreground">
                  {training.startTime || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Dauer</p>
                <p className="text-muted-foreground">
                  {training.duration ? `${training.duration} Min.` : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Referent</p>
                <p className="text-muted-foreground">
                  {training.instructor || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Ort</p>
                <p className="text-muted-foreground">
                  {training.location || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Wiederholung</p>
                <p className="text-muted-foreground">
                  {training.recurrenceMonths
                    ? `Alle ${training.recurrenceMonths} Monate`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Nächste Fälligkeit</p>
                <p
                  className={
                    training.nextDueDate && isOverdue(training.nextDueDate)
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {formatDate(training.nextDueDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt von</p>
                <p className="text-muted-foreground">
                  {training.createdBy
                    ? `${training.createdBy.firstName} ${training.createdBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              {training.template && (
                <div>
                  <p className="font-medium">Vorlage</p>
                  <p className="text-muted-foreground">
                    {training.template.title}
                  </p>
                </div>
              )}
              {training.completedAt && (
                <div>
                  <p className="font-medium">Abgeschlossen am</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(training.completedAt)}
                  </p>
                </div>
              )}
            </div>
            {training.description && (
              <div className="mt-4">
                <p className="text-sm font-medium">Beschreibung</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {training.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Status-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle>Status-Verwaltung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusForm.status}
                onValueChange={(v) =>
                  setStatusForm({ ...statusForm, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEPLANT">Geplant</SelectItem>
                  <SelectItem value="DURCHGEFUEHRT">Durchgeführt</SelectItem>
                  <SelectItem value="ABGESAGT">Abgesagt</SelectItem>
                  <SelectItem value="UEBERFAELLIG">Überfällig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusForm.status === "DURCHGEFUEHRT" && training.recurrenceMonths && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Nächste Fälligkeit</p>
                <p className="text-muted-foreground">
                  Bei Abschluss wird die nächste Fälligkeit automatisch auf{" "}
                  {training.recurrenceMonths} Monate nach dem Schulungsdatum gesetzt.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="statusNotes">Anmerkungen</Label>
              <Textarea
                id="statusNotes"
                value={statusForm.notes}
                onChange={(e) =>
                  setStatusForm({ ...statusForm, notes: e.target.value })
                }
                placeholder="Anmerkungen zum Status..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveStatus} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Status speichern
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: Inhalt (full width) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Inhalt
              {training.sections && Array.isArray(training.sections) && training.sections.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {training.sections.length} Abschnitte
                </Badge>
              )}
            </CardTitle>
            {!editingContent ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setContentDraft(training.content || "");
                  setSectionsDraft(
                    Array.isArray(training.sections) ? training.sections : []
                  );
                  setEditingContent(true);
                }}
              >
                Bearbeiten
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingContent(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveContent}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingContent ? (
            <div className="space-y-4">
              {sectionsDraft.length > 0 ? (
                <SectionEditor sections={sectionsDraft} onChange={setSectionsDraft} />
              ) : (
                <Textarea
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  placeholder="Schulungsinhalte, Agenda, Themen..."
                  rows={12}
                  className="font-mono text-sm"
                />
              )}
            </div>
          ) : training.sections && Array.isArray(training.sections) && training.sections.length > 0 ? (
            <SectionEditor
              sections={training.sections}
              onChange={() => {}}
              readOnly
            />
          ) : training.content ? (
            <div className="whitespace-pre-wrap text-sm">{training.content}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch kein Inhalt hinterlegt. Klicken Sie auf &quot;Bearbeiten&quot;, um
              den Schulungsinhalt zu erfassen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Teilnehmerliste (full width) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teilnehmerliste
              <Badge variant="secondary" className="ml-2">
                {attendedCount}/{training.participants.length} teilgenommen
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAttended}
                disabled={training.participants.length === 0}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Alle als teilgenommen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddParticipant(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Teilnehmer hinzufügen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add participant inline form */}
          {showAddParticipant && (
            <div className="mb-4 rounded-md border p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Vor- und Nachname"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddParticipant();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abteilung</Label>
                  <Input
                    value={newParticipantDept}
                    onChange={(e) => setNewParticipantDept(e.target.value)}
                    placeholder="z.B. Produktion"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddParticipant();
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddParticipant}
                  disabled={!newParticipantName.trim() || addingParticipant}
                >
                  {addingParticipant && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Hinzufügen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddParticipant(false);
                    setNewParticipantName("");
                    setNewParticipantDept("");
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {training.participants.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Abteilung</TableHead>
                      <TableHead className="text-center">Teilgenommen</TableHead>
                      <TableHead>Unterschrift</TableHead>
                      <TableHead>Anmerkungen</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {training.participants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">
                          {participant.participantName}
                        </TableCell>
                        <TableCell>
                          {participant.department || "\u2014"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={attendance[participant.id] ?? participant.attended}
                            onCheckedChange={() =>
                              toggleAttendance(participant.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {participant.signedAt
                            ? formatDateTime(participant.signedAt)
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {participant.notes || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteParticipant(participant.id)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Teilnahme speichern
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Teilnehmer hinzugefügt.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
