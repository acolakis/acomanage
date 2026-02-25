"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  ShieldAlert,
  Users,
  Phone,
  ClipboardList,
  Calendar,
  AlertTriangle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// -- Label maps --

const typeLabels: Record<string, string> = {
  BRAND: "Brand",
  CHEMIE: "Chemieunfall",
  UNFALL: "Arbeitsunfall",
  EVAKUIERUNG: "Evakuierung",
  NATURKATASTROPHE: "Naturkatastrophe",
  STROMAUSFALL: "Stromausfall",
  SONSTIG: "Sonstig",
};

const typeColors: Record<string, string> = {
  BRAND: "bg-red-100 text-red-800 border-red-300",
  CHEMIE: "bg-purple-100 text-purple-800 border-purple-300",
  UNFALL: "bg-orange-100 text-orange-800 border-orange-300",
  EVAKUIERUNG: "bg-blue-100 text-blue-800 border-blue-300",
  NATURKATASTROPHE: "bg-amber-100 text-amber-800 border-amber-300",
  STROMAUSFALL: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SONSTIG: "bg-gray-100 text-gray-800 border-gray-300",
};

// -- Types --

interface ResponsiblePerson {
  name: string;
  role: string;
  phone: string;
}

interface EmergencyNumber {
  name: string;
  number: string;
}

interface Drill {
  id: string;
  planId: string;
  drillDate: string;
  participants: string | null;
  duration: number | null;
  findings: string | null;
  evaluation: string | null;
  improvementActions: string | null;
  createdAt: string;
}

interface PlanData {
  id: string;
  companyId: string;
  title: string;
  emergencyType: string;
  description: string | null;
  procedures: string | null;
  responsiblePersons: ResponsiblePerson[] | null;
  emergencyNumbers: EmergencyNumber[] | null;
  documentPath: string | null;
  lastDrillDate: string | null;
  nextDrillDate: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  drills: Drill[];
}

interface NotfallplanDetailProps {
  plan: PlanData;
}

export function NotfallplanDetail({ plan: initialData }: NotfallplanDetailProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanData>(initialData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Procedures editing
  const [editingProcedures, setEditingProcedures] = useState(false);
  const [proceduresDraft, setProceduresDraft] = useState(plan.procedures || "");

  // Responsible persons editing
  const [editingPersons, setEditingPersons] = useState(false);
  const [personsDraft, setPersonsDraft] = useState<ResponsiblePerson[]>(
    plan.responsiblePersons || []
  );

  // Emergency numbers editing
  const [editingNumbers, setEditingNumbers] = useState(false);
  const [numbersDraft, setNumbersDraft] = useState<EmergencyNumber[]>(
    plan.emergencyNumbers || []
  );

  // Add drill form
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [drillForm, setDrillForm] = useState({
    drillDate: "",
    participants: "",
    duration: "",
    findings: "",
    evaluation: "",
    improvementActions: "",
  });
  const [addingDrill, setAddingDrill] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch (error) {
      console.error("Error refreshing plan:", error);
    }
  }, [plan.id]);

  // -- Delete plan (soft delete) --
  const handleDelete = async () => {
    if (!confirm("Notfallplan wirklich deaktivieren?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/notfallplanung");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert("Fehler beim Löschen des Notfallplans");
    } finally {
      setDeleting(false);
    }
  };

  // -- Save procedures --
  const handleSaveProcedures = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedures: proceduresDraft || null }),
      });
      if (res.ok) {
        setEditingProcedures(false);
        await refreshPlan();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving procedures:", error);
      alert("Fehler beim Speichern der Ablaufverfahren");
    } finally {
      setSaving(false);
    }
  };

  // -- Save responsible persons --
  const handleSavePersons = async () => {
    setSaving(true);
    const filtered = personsDraft.filter((p) => p.name.trim());
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsiblePersons: filtered.length > 0 ? filtered : null,
        }),
      });
      if (res.ok) {
        setEditingPersons(false);
        await refreshPlan();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving persons:", error);
      alert("Fehler beim Speichern der verantwortlichen Personen");
    } finally {
      setSaving(false);
    }
  };

  // -- Save emergency numbers --
  const handleSaveNumbers = async () => {
    setSaving(true);
    const filtered = numbersDraft.filter((n) => n.name.trim() || n.number.trim());
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyNumbers: filtered.length > 0 ? filtered : null,
        }),
      });
      if (res.ok) {
        setEditingNumbers(false);
        await refreshPlan();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving numbers:", error);
      alert("Fehler beim Speichern der Notrufnummern");
    } finally {
      setSaving(false);
    }
  };

  // -- Person draft management --
  const addPersonDraft = () => {
    setPersonsDraft([...personsDraft, { name: "", role: "", phone: "" }]);
  };

  const removePersonDraft = (index: number) => {
    setPersonsDraft(personsDraft.filter((_, i) => i !== index));
  };

  const updatePersonDraft = (index: number, field: keyof ResponsiblePerson, value: string) => {
    const updated = [...personsDraft];
    updated[index] = { ...updated[index], [field]: value };
    setPersonsDraft(updated);
  };

  // -- Number draft management --
  const addNumberDraft = () => {
    setNumbersDraft([...numbersDraft, { name: "", number: "" }]);
  };

  const removeNumberDraft = (index: number) => {
    setNumbersDraft(numbersDraft.filter((_, i) => i !== index));
  };

  const updateNumberDraft = (index: number, field: keyof EmergencyNumber, value: string) => {
    const updated = [...numbersDraft];
    updated[index] = { ...updated[index], [field]: value };
    setNumbersDraft(updated);
  };

  // -- Add drill --
  const handleAddDrill = async () => {
    if (!drillForm.drillDate) return;
    setAddingDrill(true);
    try {
      const res = await fetch(`/api/emergency-plans/${plan.id}/drills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillDate: drillForm.drillDate,
          participants: drillForm.participants || null,
          duration: drillForm.duration || null,
          findings: drillForm.findings || null,
          evaluation: drillForm.evaluation || null,
          improvementActions: drillForm.improvementActions || null,
        }),
      });
      if (res.ok) {
        setDrillForm({
          drillDate: "",
          participants: "",
          duration: "",
          findings: "",
          evaluation: "",
          improvementActions: "",
        });
        setShowAddDrill(false);
        await refreshPlan();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Erstellen der Übung");
      }
    } catch (error) {
      console.error("Error adding drill:", error);
      alert("Fehler beim Erstellen der Übung");
    } finally {
      setAddingDrill(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notfallplanung">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{plan.company.name}</span>
            <Badge className={typeColors[plan.emergencyType]}>
              {typeLabels[plan.emergencyType] || plan.emergencyType}
            </Badge>
            {plan.isActive ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Aktiv
              </Badge>
            ) : (
              <Badge variant="destructive">Inaktiv</Badge>
            )}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting || !plan.isActive}
        >
          {deleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Deaktivieren
        </Button>
      </div>

      {/* Card 1: Basisdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Basisdaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Titel</p>
              <p className="text-muted-foreground">{plan.title}</p>
            </div>
            <div>
              <p className="font-medium">Notfalltyp</p>
              <p className="text-muted-foreground">
                {typeLabels[plan.emergencyType] || plan.emergencyType}
              </p>
            </div>
            <div>
              <p className="font-medium">Betrieb</p>
              <p className="text-muted-foreground">{plan.company.name}</p>
            </div>
            <div>
              <p className="font-medium">Version</p>
              <p className="text-muted-foreground">{plan.version}</p>
            </div>
            <div>
              <p className="font-medium">Erstellt von</p>
              <p className="text-muted-foreground">
                {plan.createdBy
                  ? `${plan.createdBy.firstName} ${plan.createdBy.lastName}`
                  : "\u2014"}
              </p>
            </div>
            <div>
              <p className="font-medium">Erstellt am</p>
              <p className="text-muted-foreground">{formatDate(plan.createdAt)}</p>
            </div>
          </div>
          {plan.description && (
            <div className="mt-4">
              <p className="text-sm font-medium">Beschreibung</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                {plan.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Ablaufverfahren */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Ablaufverfahren
            </CardTitle>
            {!editingProcedures ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProceduresDraft(plan.procedures || "");
                  setEditingProcedures(true);
                }}
              >
                Bearbeiten
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProcedures(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProcedures}
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
          {editingProcedures ? (
            <Textarea
              value={proceduresDraft}
              onChange={(e) => setProceduresDraft(e.target.value)}
              placeholder={"1. Alarm auslösen\n2. Mitarbeiter informieren\n3. Sammelplatz aufsuchen\n..."}
              rows={10}
              className="font-mono text-sm"
            />
          ) : plan.procedures ? (
            <div className="whitespace-pre-wrap text-sm">{plan.procedures}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Ablaufverfahren hinterlegt. Klicken Sie auf &quot;Bearbeiten&quot;, um
              die Notfallmaßnahmen zu erfassen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Verantwortliche & Notrufnummern */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verantwortliche Personen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Verantwortliche Personen
              </CardTitle>
              {!editingPersons ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPersonsDraft(
                      plan.responsiblePersons && plan.responsiblePersons.length > 0
                        ? [...plan.responsiblePersons]
                        : [{ name: "", role: "", phone: "" }]
                    );
                    setEditingPersons(true);
                  }}
                >
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPersons(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePersons}
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
            {editingPersons ? (
              <div className="space-y-3">
                {personsDraft.map((person, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={person.name}
                        onChange={(e) => updatePersonDraft(index, "name", e.target.value)}
                        placeholder="Name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={person.role}
                          onChange={(e) => updatePersonDraft(index, "role", e.target.value)}
                          placeholder="Rolle"
                        />
                        <Input
                          value={person.phone}
                          onChange={(e) => updatePersonDraft(index, "phone", e.target.value)}
                          placeholder="Telefon"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePersonDraft(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPersonDraft}>
                  <Plus className="mr-2 h-4 w-4" />
                  Person hinzufügen
                </Button>
              </div>
            ) : plan.responsiblePersons && plan.responsiblePersons.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Telefon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.responsiblePersons.map((person, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.role || "\u2014"}</TableCell>
                        <TableCell>{person.phone || "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine verantwortlichen Personen hinterlegt.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notrufnummern */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Notrufnummern
              </CardTitle>
              {!editingNumbers ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNumbersDraft(
                      plan.emergencyNumbers && plan.emergencyNumbers.length > 0
                        ? [...plan.emergencyNumbers]
                        : [{ name: "", number: "" }]
                    );
                    setEditingNumbers(true);
                  }}
                >
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingNumbers(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNumbers}
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
            {editingNumbers ? (
              <div className="space-y-3">
                {numbersDraft.map((num, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Input
                        value={num.name}
                        onChange={(e) => updateNumberDraft(index, "name", e.target.value)}
                        placeholder="Bezeichnung"
                      />
                      <Input
                        value={num.number}
                        onChange={(e) => updateNumberDraft(index, "number", e.target.value)}
                        placeholder="Telefonnummer"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNumberDraft(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addNumberDraft}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nummer hinzufügen
                </Button>
              </div>
            ) : plan.emergencyNumbers && plan.emergencyNumbers.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bezeichnung</TableHead>
                      <TableHead>Nummer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.emergencyNumbers.map((num, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{num.name}</TableCell>
                        <TableCell>{num.number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Notrufnummern hinterlegt.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card 4: Übungshistorie */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Übungshistorie
              <Badge variant="secondary" className="ml-2">
                {plan.drills.length} {plan.drills.length === 1 ? "Übung" : "Übungen"}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDrill(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Übung hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add drill form */}
          {showAddDrill && (
            <div className="mb-4 rounded-md border p-4 space-y-4">
              <h4 className="font-medium">Neue Übung erfassen</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Datum <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={drillForm.drillDate}
                    onChange={(e) =>
                      setDrillForm({ ...drillForm, drillDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dauer (Minuten)</Label>
                  <Input
                    type="number"
                    value={drillForm.duration}
                    onChange={(e) =>
                      setDrillForm({ ...drillForm, duration: e.target.value })
                    }
                    placeholder="z.B. 60"
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teilnehmer</Label>
                <Input
                  value={drillForm.participants}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, participants: e.target.value })
                  }
                  placeholder="z.B. Alle Mitarbeiter Werk 1, ca. 50 Personen"
                />
              </div>
              <div className="space-y-2">
                <Label>Feststellungen / Ergebnisse</Label>
                <Textarea
                  value={drillForm.findings}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, findings: e.target.value })
                  }
                  placeholder="Beobachtungen und Feststellungen während der Übung..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Bewertung</Label>
                <Textarea
                  value={drillForm.evaluation}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, evaluation: e.target.value })
                  }
                  placeholder="Gesamtbewertung der Übung..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Verbesserungsmaßnahmen</Label>
                <Textarea
                  value={drillForm.improvementActions}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, improvementActions: e.target.value })
                  }
                  placeholder="Abgeleitete Maßnahmen zur Verbesserung..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddDrill}
                  disabled={!drillForm.drillDate || addingDrill}
                >
                  {addingDrill && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  Übung speichern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddDrill(false);
                    setDrillForm({
                      drillDate: "",
                      participants: "",
                      duration: "",
                      findings: "",
                      evaluation: "",
                      improvementActions: "",
                    });
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {plan.drills.length > 0 ? (
            <div className="space-y-4">
              {plan.drills.map((drill) => (
                <div
                  key={drill.id}
                  className="rounded-md border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatDate(drill.drillDate)}
                      </span>
                      {drill.duration && (
                        <Badge variant="secondary">{drill.duration} Min.</Badge>
                      )}
                    </div>
                  </div>
                  {drill.participants && (
                    <div className="text-sm">
                      <span className="font-medium">Teilnehmer:</span>{" "}
                      <span className="text-muted-foreground">{drill.participants}</span>
                    </div>
                  )}
                  {drill.findings && (
                    <div className="text-sm">
                      <span className="font-medium">Feststellungen:</span>{" "}
                      <span className="text-muted-foreground whitespace-pre-wrap">{drill.findings}</span>
                    </div>
                  )}
                  {drill.evaluation && (
                    <div className="text-sm">
                      <span className="font-medium">Bewertung:</span>{" "}
                      <span className="text-muted-foreground whitespace-pre-wrap">{drill.evaluation}</span>
                    </div>
                  )}
                  {drill.improvementActions && (
                    <div className="text-sm">
                      <span className="font-medium">Verbesserungsmaßnahmen:</span>{" "}
                      <span className="text-muted-foreground whitespace-pre-wrap">{drill.improvementActions}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Übungen durchgeführt.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 5: Termine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Termine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Letzte Übung</p>
              <p className="text-muted-foreground">{formatDate(plan.lastDrillDate)}</p>
            </div>
            <div>
              <p className="font-medium">Nächste Übung</p>
              <div className="flex items-center gap-2">
                <p
                  className={
                    plan.nextDrillDate && isOverdue(plan.nextDrillDate)
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {formatDate(plan.nextDrillDate)}
                </p>
                {plan.nextDrillDate && isOverdue(plan.nextDrillDate) && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Überfällig</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="font-medium">Zuletzt aktualisiert</p>
              <p className="text-muted-foreground">{formatDate(plan.updatedAt)}</p>
            </div>
            <div>
              <p className="font-medium">Anzahl Übungen</p>
              <p className="text-muted-foreground">{plan.drills.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
