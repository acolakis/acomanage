"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

const incidentTypes = [
  { value: "UNFALL", label: "Unfall" },
  { value: "BEINAHEUNFALL", label: "Beinaheunfall" },
  { value: "VORFALL", label: "Vorfall" },
  { value: "BERUFSKRANKHEIT", label: "Berufskrankheit" },
  { value: "ERSTEHILFE", label: "Erste Hilfe" },
];

const severityOptions = [
  { value: "GERING", label: "Gering" },
  { value: "MITTEL", label: "Mittel" },
  { value: "SCHWER", label: "Schwer" },
  { value: "TOEDLICH", label: "Tödlich" },
];

export default function NeuerVorfallPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("");
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [incidentTime, setIncidentTime] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [affectedPerson, setAffectedPerson] = useState("");
  const [affectedRole, setAffectedRole] = useState("");
  const [witnesses, setWitnesses] = useState("");

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

  const handleSubmit = async () => {
    if (!companyId || !incidentType || !severity || !incidentDate || !description) return;
    setLoading(true);

    const payload = {
      companyId,
      incidentType,
      severity,
      incidentDate,
      incidentTime: incidentTime || null,
      location: location || null,
      department: department || null,
      description,
      affectedPerson: affectedPerson || null,
      affectedRole: affectedRole || null,
      witnesses: witnesses || null,
    };

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const incident = await res.json();
      router.push(`/vorfaelle/${incident.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && incidentType && severity && incidentDate && description;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vorfaelle">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Vorfall</h1>
        <p className="text-muted-foreground">
          Vorfall, Unfall oder Beinaheunfall erfassen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>Betrieb, Art und Schweregrad des Vorfalls</CardDescription>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Art des Vorfalls <span className="text-destructive">*</span></Label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Art auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schweregrad <span className="text-destructive">*</span></Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Schweregrad auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Datum <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Uhrzeit</Label>
              <Input
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ort / Arbeitsbereich</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Werkstatt, Lager, Halle 3..."
              />
            </div>
            <div className="space-y-2">
              <Label>Abteilung</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="z.B. Produktion, Logistik..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beschreibung</CardTitle>
          <CardDescription>Was ist passiert?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Beschreibung des Vorfalls <span className="text-destructive">*</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaillierte Beschreibung des Vorfalls, Hergangs und der Umstände..."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Betroffene Person</CardTitle>
          <CardDescription>Angaben zur betroffenen Person und Zeugen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name der betroffenen Person</Label>
              <Input
                value={affectedPerson}
                onChange={(e) => setAffectedPerson(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </div>
            <div className="space-y-2">
              <Label>Funktion / Rolle</Label>
              <Input
                value={affectedRole}
                onChange={(e) => setAffectedRole(e.target.value)}
                placeholder="z.B. Maschinenbediener, Lagerist..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zeugen</Label>
            <Textarea
              value={witnesses}
              onChange={(e) => setWitnesses(e.target.value)}
              placeholder="Namen und Kontaktdaten von Zeugen..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/vorfaelle">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Vorfall erfassen
        </Button>
      </div>
    </div>
  );
}
