"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

const statusLabels: Record<string, string> = {
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  UMGESETZT: "Umgesetzt",
  WIRKSAMKEIT_GEPRUEFT: "Wirksamkeit geprueft",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OFFEN: "secondary",
  IN_BEARBEITUNG: "default",
  UMGESETZT: "default",
  WIRKSAMKEIT_GEPRUEFT: "default",
  ABGESCHLOSSEN: "outline",
};

const sourceTypeLabels: Record<string, string> = {
  BEGEHUNG: "Begehung",
  GBU: "Gefährdungsbeurteilung",
  VORFALL: "Vorfall/Unfall",
  AUDIT: "Internes Audit",
  MANAGEMENT_REVIEW: "Managementbewertung",
  EXTERN: "Extern",
  SONSTIG: "Sonstig",
};

const priorityLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  SOFORT: "Sofort",
};

const priorityColors: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NIEDRIG: "outline",
  MITTEL: "secondary",
  HOCH: "default",
  SOFORT: "destructive",
};

const measureTypeLabels: Record<string, string> = {
  T: "Technisch",
  O: "Organisatorisch",
  P: "Personenbezogen",
};

const effectivenessLabels: Record<string, string> = {
  WIRKSAM: "Wirksam",
  TEILWEISE: "Teilweise wirksam",
  UNWIRKSAM: "Unwirksam",
};

interface ActionData {
  id: string;
  actionNumber: string | null;
  title: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceReference: string | null;
  priority: string;
  status: string;
  measureType: string | null;
  deadline: string | null;
  completedAt: string | null;
  effectivenessCheck: string | null;
  effectivenessDate: string | null;
  effectivenessResult: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  responsible: { firstName: string; lastName: string } | null;
  effectivenessBy: { firstName: string; lastName: string } | null;
  incident: {
    id: string;
    incidentNumber: string | null;
    incidentType: string;
    description: string | null;
  } | null;
  createdBy: { firstName: string; lastName: string } | null;
}

interface ActionDetailProps {
  action: ActionData;
}

export function ActionDetail({ action: initialAction }: ActionDetailProps) {
  const [action, setAction] = useState<ActionData>(initialAction);
  const [statusSaving, setStatusSaving] = useState(false);
  const [effectivenessSaving, setEffectivenessSaving] = useState(false);

  // Effectiveness form state
  const [effectivenessCheck, setEffectivenessCheck] = useState(
    action.effectivenessCheck || ""
  );
  const [effectivenessDate, setEffectivenessDate] = useState(
    action.effectivenessDate ? action.effectivenessDate.slice(0, 10) : ""
  );
  const [effectivenessResult, setEffectivenessResult] = useState(
    action.effectivenessResult || ""
  );

  const formatDate = (d: string | null) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue = (deadline: string | null, status: string) => {
    if (!deadline || status === "ABGESCHLOSSEN") return false;
    return new Date(deadline) < new Date();
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/corrective-actions/${action.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAction(updated);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleSaveEffectiveness = async () => {
    setEffectivenessSaving(true);
    try {
      const res = await fetch(`/api/corrective-actions/${action.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectivenessCheck: effectivenessCheck || null,
          effectivenessDate: effectivenessDate || null,
          effectivenessResult: effectivenessResult || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAction(updated);
      }
    } catch (error) {
      console.error("Error saving effectiveness:", error);
    } finally {
      setEffectivenessSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/massnahmen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurueck
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{action.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {action.actionNumber && <span>{action.actionNumber}</span>}
            <Badge variant={priorityColors[action.priority]}>
              {priorityLabels[action.priority] || action.priority}
            </Badge>
            <Badge variant={statusColors[action.status]}>
              {statusLabels[action.status] || action.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Basisdaten */}
      <Card>
        <CardHeader>
          <CardTitle>Basisdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Titel</p>
              <p className="text-muted-foreground">{action.title}</p>
            </div>
            <div>
              <p className="font-medium">Betrieb</p>
              <p className="text-muted-foreground">{action.company.name}</p>
            </div>
            <div>
              <p className="font-medium">Quelltyp</p>
              <p className="text-muted-foreground">
                {sourceTypeLabels[action.sourceType] || action.sourceType}
              </p>
            </div>
            <div>
              <p className="font-medium">Prioritaet</p>
              <p className="text-muted-foreground">
                <Badge variant={priorityColors[action.priority]}>
                  {priorityLabels[action.priority] || action.priority}
                </Badge>
              </p>
            </div>
            {action.sourceReference && (
              <div className="col-span-2">
                <p className="font-medium">Quellreferenz</p>
                <p className="text-muted-foreground">
                  {action.sourceReference}
                </p>
              </div>
            )}
            {action.measureType && (
              <div>
                <p className="font-medium">Massnahmentyp (T/O/P)</p>
                <p className="text-muted-foreground">
                  {measureTypeLabels[action.measureType] || action.measureType}
                </p>
              </div>
            )}
            {action.deadline && (
              <div>
                <p className="font-medium">Frist</p>
                <p
                  className={
                    isOverdue(action.deadline, action.status)
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {formatDate(action.deadline)}
                  {isOverdue(action.deadline, action.status) && " (ueberfaellig)"}
                </p>
              </div>
            )}
            {action.description && (
              <div className="col-span-2">
                <p className="font-medium">Beschreibung</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {action.description}
                </p>
              </div>
            )}
            {action.incident && (
              <div className="col-span-2">
                <p className="font-medium">Verknuepfter Vorfall</p>
                <Link
                  href={`/vorfaelle/${action.incident.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {action.incident.incidentNumber ||
                    action.incident.id.slice(0, 8)}{" "}
                  - {action.incident.description?.slice(0, 80) || action.incident.incidentType}
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verantwortlichkeit */}
      <Card>
        <CardHeader>
          <CardTitle>Verantwortlichkeit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Verantwortlich</p>
              <p className="text-muted-foreground">
                {action.responsible
                  ? `${action.responsible.firstName} ${action.responsible.lastName}`
                  : "\u2014"}
              </p>
            </div>
            <div>
              <p className="font-medium">Frist</p>
              <p
                className={
                  isOverdue(action.deadline, action.status)
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
                }
              >
                {formatDate(action.deadline)}
                {isOverdue(action.deadline, action.status) && " (ueberfaellig)"}
              </p>
            </div>
            <div>
              <p className="font-medium">Erstellt von</p>
              <p className="text-muted-foreground">
                {action.createdBy
                  ? `${action.createdBy.firstName} ${action.createdBy.lastName}`
                  : "\u2014"}
              </p>
            </div>
            <div>
              <p className="font-medium">Erstellt am</p>
              <p className="text-muted-foreground">
                {formatDate(action.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Umsetzung */}
      <Card>
        <CardHeader>
          <CardTitle>Status & Umsetzung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>Status</Label>
              <Select
                value={action.status}
                onValueChange={handleStatusChange}
                disabled={statusSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-6" />
            )}
          </div>
          {action.completedAt && (
            <div className="text-sm">
              <p className="font-medium">Abgeschlossen am</p>
              <p className="text-muted-foreground">
                {formatDate(action.completedAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wirksamkeitspruefung */}
      <Card>
        <CardHeader>
          <CardTitle>Wirksamkeitspruefung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wirksamkeitspruefung</Label>
            <Textarea
              value={effectivenessCheck}
              onChange={(e) => setEffectivenessCheck(e.target.value)}
              placeholder="Beschreibung der Wirksamkeitspruefung..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum der Pruefung</Label>
              <Input
                type="date"
                value={effectivenessDate}
                onChange={(e) => setEffectivenessDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ergebnis</Label>
              <Select
                value={effectivenessResult || "__none__"}
                onValueChange={(v) =>
                  setEffectivenessResult(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ergebnis waehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Kein Ergebnis</SelectItem>
                  {Object.entries(effectivenessLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {action.effectivenessBy && (
            <div className="text-sm">
              <p className="font-medium">Geprueft von</p>
              <p className="text-muted-foreground">
                {action.effectivenessBy.firstName}{" "}
                {action.effectivenessBy.lastName}
              </p>
            </div>
          )}
          <Button
            onClick={handleSaveEffectiveness}
            disabled={effectivenessSaving}
          >
            {effectivenessSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {effectivenessSaving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
