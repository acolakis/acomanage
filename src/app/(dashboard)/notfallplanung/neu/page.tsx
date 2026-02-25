"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
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

interface Company {
  id: string;
  name: string;
}

interface ResponsiblePerson {
  name: string;
  role: string;
  phone: string;
}

interface EmergencyNumber {
  name: string;
  number: string;
}

const emergencyTypes = [
  { value: "BRAND", label: "Brand" },
  { value: "CHEMIE", label: "Chemieunfall" },
  { value: "UNFALL", label: "Arbeitsunfall" },
  { value: "EVAKUIERUNG", label: "Evakuierung" },
  { value: "NATURKATASTROPHE", label: "Naturkatastrophe" },
  { value: "STROMAUSFALL", label: "Stromausfall" },
  { value: "SONSTIG", label: "Sonstig" },
];

export default function NeuerNotfallplanPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [emergencyType, setEmergencyType] = useState("");
  const [description, setDescription] = useState("");
  const [procedures, setProcedures] = useState("");
  const [nextDrillDate, setNextDrillDate] = useState("");
  const [responsiblePersons, setResponsiblePersons] = useState<ResponsiblePerson[]>([
    { name: "", role: "", phone: "" },
  ]);
  const [emergencyNumbers, setEmergencyNumbers] = useState<EmergencyNumber[]>([
    { name: "Feuerwehr", number: "112" },
    { name: "Rettungsdienst", number: "112" },
    { name: "Polizei", number: "110" },
  ]);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(
            data
              .filter((c: Company & { isActive?: boolean }) => c.isActive !== false)
              .map((c: Company) => ({ id: c.id, name: c.name }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const addResponsiblePerson = () => {
    setResponsiblePersons([...responsiblePersons, { name: "", role: "", phone: "" }]);
  };

  const removeResponsiblePerson = (index: number) => {
    setResponsiblePersons(responsiblePersons.filter((_, i) => i !== index));
  };

  const updateResponsiblePerson = (index: number, field: keyof ResponsiblePerson, value: string) => {
    const updated = [...responsiblePersons];
    updated[index] = { ...updated[index], [field]: value };
    setResponsiblePersons(updated);
  };

  const addEmergencyNumber = () => {
    setEmergencyNumbers([...emergencyNumbers, { name: "", number: "" }]);
  };

  const removeEmergencyNumber = (index: number) => {
    setEmergencyNumbers(emergencyNumbers.filter((_, i) => i !== index));
  };

  const updateEmergencyNumber = (index: number, field: keyof EmergencyNumber, value: string) => {
    const updated = [...emergencyNumbers];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyNumbers(updated);
  };

  const handleSubmit = async () => {
    if (!companyId || !title || !emergencyType) return;
    setLoading(true);

    const filteredPersons = responsiblePersons.filter((p) => p.name.trim());
    const filteredNumbers = emergencyNumbers.filter((n) => n.name.trim() || n.number.trim());

    const payload = {
      companyId,
      title,
      emergencyType,
      description: description || null,
      procedures: procedures || null,
      responsiblePersons: filteredPersons.length > 0 ? filteredPersons : null,
      emergencyNumbers: filteredNumbers.length > 0 ? filteredNumbers : null,
      nextDrillDate: nextDrillDate || null,
    };

    try {
      const res = await fetch("/api/emergency-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const plan = await res.json();
      router.push(`/notfallplanung/${plan.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && title && emergencyType;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notfallplanung">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Notfallplan</h1>
        <p className="text-muted-foreground">
          Notfallplan nach ISO 45001 Abschnitt 8.2 erstellen
        </p>
      </div>

      {/* Grunddaten */}
      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>Betrieb, Typ und allgemeine Informationen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Betrieb <span className="text-destructive">*</span></Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Betrieb auswählen" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titel <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Brandschutzplan Werk 1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notfalltyp <span className="text-destructive">*</span></Label>
              <Select value={emergencyType} onValueChange={setEmergencyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {emergencyTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nächste Übung</Label>
              <Input
                type="date"
                value={nextDrillDate}
                onChange={(e) => setNextDrillDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung des Notfallplans..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ablaufverfahren */}
      <Card>
        <CardHeader>
          <CardTitle>Ablaufverfahren</CardTitle>
          <CardDescription>Schrittweise Beschreibung der Notfallmaßnahmen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Verfahren / Maßnahmen</Label>
            <Textarea
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
              placeholder={"1. Alarm auslösen\n2. Mitarbeiter informieren\n3. Sammelplatz aufsuchen\n4. Feuerwehr einweisen\n5. ..."}
              rows={8}
            />
          </div>
        </CardContent>
      </Card>

      {/* Verantwortliche Personen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verantwortliche Personen</CardTitle>
              <CardDescription>Ansprechpartner im Notfall</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addResponsiblePerson}>
              <Plus className="mr-2 h-4 w-4" />
              Person hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {responsiblePersons.map((person, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Input
                  value={person.name}
                  onChange={(e) => updateResponsiblePerson(index, "name", e.target.value)}
                  placeholder="Name"
                />
                <Input
                  value={person.role}
                  onChange={(e) => updateResponsiblePerson(index, "role", e.target.value)}
                  placeholder="Rolle / Funktion"
                />
                <Input
                  value={person.phone}
                  onChange={(e) => updateResponsiblePerson(index, "phone", e.target.value)}
                  placeholder="Telefonnummer"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeResponsiblePerson(index)}
                disabled={responsiblePersons.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notrufnummern */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notrufnummern</CardTitle>
              <CardDescription>Wichtige Telefonnummern für den Notfall</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addEmergencyNumber}>
              <Plus className="mr-2 h-4 w-4" />
              Nummer hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {emergencyNumbers.map((num, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Input
                  value={num.name}
                  onChange={(e) => updateEmergencyNumber(index, "name", e.target.value)}
                  placeholder="Bezeichnung (z.B. Feuerwehr)"
                />
                <Input
                  value={num.number}
                  onChange={(e) => updateEmergencyNumber(index, "number", e.target.value)}
                  placeholder="Telefonnummer"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEmergencyNumber(index)}
                disabled={emergencyNumbers.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/notfallplanung">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Notfallplan erstellen
        </Button>
      </div>
    </div>
  );
}
