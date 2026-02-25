"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const changeTypeLabels: Record<string, string> = {
  PROZESS: "Prozessänderung",
  ARBEITSPLATZ: "Arbeitsplatzänderung",
  MATERIAL: "Materialänderung",
  ORGANISATION: "Organisationsänderung",
  SONSTIG: "Sonstige",
};

const statusLabels: Record<string, string> = {
  BEANTRAGT: "Beantragt",
  BEWERTET: "Bewertet",
  GENEHMIGT: "Genehmigt",
  UMGESETZT: "Umgesetzt",
  ABGELEHNT: "Abgelehnt",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BEANTRAGT: "secondary",
  BEWERTET: "outline",
  GENEHMIGT: "default",
  UMGESETZT: "outline",
  ABGELEHNT: "destructive",
};

const statusExtraClasses: Record<string, string> = {
  UMGESETZT: "border-green-500 text-green-700",
};

interface ChangeRequestData {
  id: string;
  changeNumber: string | null;
  title: string;
  changeType: string;
  description: string | null;
  risksBefore: string | null;
  risksAfter: string | null;
  mitigations: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  implementedAt: string | null;
  company: { id: string; name: string };
  requestedBy: { firstName: string; lastName: string } | null;
  approvedBy: { firstName: string; lastName: string } | null;
}

interface ChangeRequestDetailProps {
  changeRequest: ChangeRequestData;
}

export function ChangeRequestDetail({ changeRequest: initialData }: ChangeRequestDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<ChangeRequestData>(initialData);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Risk assessment form
  const [riskForm, setRiskForm] = useState({
    risksBefore: data.risksBefore || "",
    risksAfter: data.risksAfter || "",
    mitigations: data.mitigations || "",
  });

  // Status form
  const [statusForm, setStatusForm] = useState(data.status);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/change-requests/${data.id}`);
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setRiskForm({
          risksBefore: updated.risksBefore || "",
          risksAfter: updated.risksAfter || "",
          mitigations: updated.mitigations || "",
        });
        setStatusForm(updated.status);
      }
    } catch (error) {
      console.error("Error refreshing change request:", error);
    }
  }, [data.id]);

  const handleSaveRisks = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/change-requests/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risksBefore: riskForm.risksBefore || null,
          risksAfter: riskForm.risksAfter || null,
          mitigations: riskForm.mitigations || null,
        }),
      });
      if (res.ok) {
        await refreshData();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving risks:", error);
      alert("Fehler beim Speichern der Risikobewertung");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/change-requests/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusForm }),
      });
      if (res.ok) {
        await refreshData();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving status:", error);
      alert("Fehler beim Speichern des Status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Änderungsantrag wirklich löschen?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/change-requests/${data.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/aenderungsmanagement");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting change request:", error);
      alert("Fehler beim Löschen des Änderungsantrags");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/aenderungsmanagement">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {data.changeNumber && <span>{data.changeNumber}</span>}
            <Badge variant="outline">
              {changeTypeLabels[data.changeType] || data.changeType}
            </Badge>
            <Badge
              variant={statusVariants[data.status] || "secondary"}
              className={statusExtraClasses[data.status] || ""}
            >
              {statusLabels[data.status] || data.status}
            </Badge>
            <span>{data.company.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {data.status === "BEANTRAGT" && (
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
            <CardTitle>Basisdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Titel</p>
                <p className="text-muted-foreground">{data.title}</p>
              </div>
              <div>
                <p className="font-medium">Typ</p>
                <p className="text-muted-foreground">
                  {changeTypeLabels[data.changeType] || data.changeType}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-medium">Beschreibung</p>
                <p className="text-muted-foreground whitespace-pre-wrap mt-1">
                  {data.description || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Beantragt von</p>
                <p className="text-muted-foreground">
                  {data.requestedBy
                    ? `${data.requestedBy.firstName} ${data.requestedBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Datum</p>
                <p className="text-muted-foreground">
                  {formatDate(data.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Risikobewertung */}
        <Card>
          <CardHeader>
            <CardTitle>Risikobewertung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risksBefore">Risiken VOR der Änderung</Label>
              <Textarea
                id="risksBefore"
                value={riskForm.risksBefore}
                onChange={(e) =>
                  setRiskForm({ ...riskForm, risksBefore: e.target.value })
                }
                placeholder="Welche Risiken bestehen aktuell?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risksAfter">Risiken NACH der Änderung</Label>
              <Textarea
                id="risksAfter"
                value={riskForm.risksAfter}
                onChange={(e) =>
                  setRiskForm({ ...riskForm, risksAfter: e.target.value })
                }
                placeholder="Welche Risiken werden nach der Änderung erwartet?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mitigations">Maßnahmen zur Risikominderung</Label>
              <Textarea
                id="mitigations"
                value={riskForm.mitigations}
                onChange={(e) =>
                  setRiskForm({ ...riskForm, mitigations: e.target.value })
                }
                placeholder="Welche Maßnahmen werden ergriffen?"
                rows={3}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveRisks}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Risikobewertung speichern
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Status-Verwaltung */}
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
                  <SelectItem value="BEANTRAGT">Beantragt</SelectItem>
                  <SelectItem value="BEWERTET">Bewertet</SelectItem>
                  <SelectItem value="GENEHMIGT">Genehmigt</SelectItem>
                  <SelectItem value="UMGESETZT">Umgesetzt</SelectItem>
                  <SelectItem value="ABGELEHNT">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={handleSaveStatus}
              disabled={statusSaving}
            >
              {statusSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Status speichern
            </Button>

            {/* Approval info */}
            {data.approvedBy && data.approvedAt && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {data.status === "ABGELEHNT" ? "Abgelehnt von" : "Genehmigt von"}
                </p>
                <p className="text-muted-foreground">
                  {data.approvedBy.firstName} {data.approvedBy.lastName}
                  <span className="ml-2">
                    am {formatDate(data.approvedAt)}
                  </span>
                </p>
              </div>
            )}

            {/* Implementation date */}
            {data.implementedAt && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Umgesetzt am</p>
                <p className="text-muted-foreground">
                  {formatDate(data.implementedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
