"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Plus,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

const statusLabels: Record<string, string> = {
  ENTWURF: "Entwurf",
  AKTIV: "Aktiv",
  ERREICHT: "Erreicht",
  NICHT_ERREICHT: "Nicht erreicht",
  ARCHIVIERT: "Archiviert",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ENTWURF: "secondary",
  AKTIV: "default",
  ERREICHT: "outline",
  NICHT_ERREICHT: "destructive",
  ARCHIVIERT: "outline",
};

const statusClasses: Record<string, string> = {
  ERREICHT: "border-green-300 text-green-700 bg-green-50",
};

interface ProgressEntry {
  id: string;
  value: string;
  note: string | null;
  recordedAt: string;
  recordedBy: { firstName: string; lastName: string } | null;
}

interface ObjectiveData {
  id: string;
  title: string;
  description: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  isoClause: string | null;
  relatedRiskId: string | null;
  createdAt: string;
  company: { id: string; name: string };
  responsible: { id: string; firstName: string; lastName: string } | null;
  createdBy: { firstName: string; lastName: string } | null;
  progress: ProgressEntry[];
}

interface ZielDetailProps {
  objective: ObjectiveData;
}

function getProgressPercent(current: string | null, target: string | null): number | null {
  if (!current || !target) return null;
  const c = parseFloat(current);
  const t = parseFloat(target);
  if (isNaN(c) || isNaN(t) || t === 0) return null;
  return Math.min(100, Math.max(0, (c / t) * 100));
}

export function ZielDetail({ objective: initialData }: ZielDetailProps) {
  const router = useRouter();
  const [objective, setObjective] = useState<ObjectiveData>(initialData);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status form
  const [selectedStatus, setSelectedStatus] = useState(objective.status);

  // Progress form
  const [progressValue, setProgressValue] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressSaving, setProgressSaving] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const refreshObjective = useCallback(async () => {
    try {
      const res = await fetch(`/api/objectives/${objective.id}`);
      if (res.ok) {
        const data = await res.json();
        setObjective(data);
        setSelectedStatus(data.status);
      }
    } catch (error) {
      console.error("Error refreshing objective:", error);
    }
  }, [objective.id]);

  // Save status
  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/objectives/${objective.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (res.ok) {
        await refreshObjective();
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

  // Add progress entry
  const handleAddProgress = async () => {
    if (!progressValue) return;
    setProgressSaving(true);
    try {
      const res = await fetch(`/api/objectives/${objective.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: progressValue,
          note: progressNote || null,
        }),
      });
      if (res.ok) {
        setProgressValue("");
        setProgressNote("");
        await refreshObjective();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Hinzufügen");
      }
    } catch (error) {
      console.error("Error adding progress:", error);
      alert("Fehler beim Hinzufügen des Fortschritts");
    } finally {
      setProgressSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm("SGA-Ziel wirklich löschen?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/objectives/${objective.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/ziele");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting objective:", error);
      alert("Fehler beim Löschen des SGA-Ziels");
    } finally {
      setDeleteLoading(false);
    }
  };

  const progressPercent = getProgressPercent(
    objective.currentValue,
    objective.targetValue
  );

  const isOverdue =
    objective.targetDate &&
    objective.status !== "ERREICHT" &&
    objective.status !== "ARCHIVIERT" &&
    new Date(objective.targetDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ziele">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {objective.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{objective.company.name}</span>
            <Badge
              variant={statusColors[objective.status]}
              className={statusClasses[objective.status] || ""}
            >
              {statusLabels[objective.status] || objective.status}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">Überfällig</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {objective.status === "ENTWURF" && (
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
              <Target className="h-5 w-5" />
              Basisdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="font-medium">Titel</p>
                <p className="text-muted-foreground">{objective.title}</p>
              </div>
              {objective.description && (
                <div className="col-span-2">
                  <p className="font-medium">Beschreibung</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {objective.description}
                  </p>
                </div>
              )}
              <div>
                <p className="font-medium">Betrieb</p>
                <p className="text-muted-foreground">{objective.company.name}</p>
              </div>
              <div>
                <p className="font-medium">ISO-Klausel</p>
                <p className="text-muted-foreground">
                  {objective.isoClause || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Startdatum</p>
                <p className="text-muted-foreground">
                  {formatDate(objective.startDate)}
                </p>
              </div>
              <div>
                <p className="font-medium">Zieldatum</p>
                <p className={`text-muted-foreground ${isOverdue ? "text-destructive font-medium" : ""}`}>
                  {formatDate(objective.targetDate)}
                  {isOverdue && " (überfällig)"}
                </p>
              </div>
              <div>
                <p className="font-medium">Verantwortlich</p>
                <p className="text-muted-foreground">
                  {objective.responsible
                    ? `${objective.responsible.firstName} ${objective.responsible.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt von</p>
                <p className="text-muted-foreground">
                  {objective.createdBy
                    ? `${objective.createdBy.firstName} ${objective.createdBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt am</p>
                <p className="text-muted-foreground">
                  {formatDate(objective.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Zielvorgaben */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Zielvorgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Zielwert</p>
                  <p className="text-muted-foreground text-lg">
                    {objective.targetValue || "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Aktueller Wert</p>
                  <p className="text-muted-foreground text-lg">
                    {objective.currentValue || "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Einheit</p>
                  <p className="text-muted-foreground text-lg">
                    {objective.unit || "\u2014"}
                  </p>
                </div>
              </div>

              {progressPercent !== null && (
                <div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Fortschritt</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Fortschrittsverlauf */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fortschrittsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New entry form */}
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Neuer Eintrag
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Wert</Label>
                  <Input
                    value={progressValue}
                    onChange={(e) => setProgressValue(e.target.value)}
                    placeholder="z.B. 8, 65%, 2"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notiz</Label>
                  <Input
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Optionale Notiz..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddProgress}
                disabled={!progressValue || progressSaving}
              >
                {progressSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Eintrag hinzufügen
              </Button>
            </div>

            {/* Progress entries list */}
            {objective.progress.length > 0 ? (
              <div className="space-y-2">
                {objective.progress.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {entry.value} {objective.unit || ""}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0 ml-4">
                      <p>
                        {new Date(entry.recordedAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                      {entry.recordedBy && (
                        <p>
                          {entry.recordedBy.firstName} {entry.recordedBy.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Fortschrittseinträge vorhanden.
              </p>
            )}
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
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTWURF">Entwurf</SelectItem>
                  <SelectItem value="AKTIV">Aktiv</SelectItem>
                  <SelectItem value="ERREICHT">Erreicht</SelectItem>
                  <SelectItem value="NICHT_ERREICHT">Nicht erreicht</SelectItem>
                  <SelectItem value="ARCHIVIERT">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveStatus}
              disabled={saving || selectedStatus === objective.status}
            >
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
    </div>
  );
}
