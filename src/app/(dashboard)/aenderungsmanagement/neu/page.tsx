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

const changeTypeOptions = [
  { value: "PROZESS", label: "Prozessänderung" },
  { value: "ARBEITSPLATZ", label: "Arbeitsplatzänderung" },
  { value: "MATERIAL", label: "Materialänderung" },
  { value: "ORGANISATION", label: "Organisationsänderung" },
  { value: "SONSTIG", label: "Sonstige" },
];

export default function NeuerAenderungsantragPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [changeType, setChangeType] = useState("");
  const [description, setDescription] = useState("");
  const [risksBefore, setRisksBefore] = useState("");
  const [risksAfter, setRisksAfter] = useState("");
  const [mitigations, setMitigations] = useState("");

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
    if (!companyId || !title || !changeType) return;
    setLoading(true);

    const payload = {
      companyId,
      title,
      changeType,
      description: description || null,
      risksBefore: risksBefore || null,
      risksAfter: risksAfter || null,
      mitigations: mitigations || null,
    };

    try {
      const res = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const changeRequest = await res.json();
      router.push(`/aenderungsmanagement/${changeRequest.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && title && changeType;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/aenderungsmanagement">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Änderungsantrag</h1>
        <p className="text-muted-foreground">
          Änderungsantrag gemäß ISO 45001 Abschnitt 8.1.3 erfassen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>Betrieb, Titel und Art der Änderung</CardDescription>
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
              placeholder="Kurze Beschreibung der Änderung..."
            />
          </div>

          <div className="space-y-2">
            <Label>Änderungstyp <span className="text-destructive">*</span></Label>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                {changeTypeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaillierte Beschreibung der geplanten Änderung..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risikobewertung</CardTitle>
          <CardDescription>Risiken vor und nach der Änderung sowie Maßnahmen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Risiken vor der Änderung</Label>
            <Textarea
              value={risksBefore}
              onChange={(e) => setRisksBefore(e.target.value)}
              placeholder="Welche Risiken bestehen aktuell vor der Änderung?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Risiken nach der Änderung</Label>
            <Textarea
              value={risksAfter}
              onChange={(e) => setRisksAfter(e.target.value)}
              placeholder="Welche Risiken werden nach der Änderung erwartet?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Maßnahmen zur Risikominderung</Label>
            <Textarea
              value={mitigations}
              onChange={(e) => setMitigations(e.target.value)}
              placeholder="Welche Maßnahmen werden ergriffen, um Risiken zu minimieren?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/aenderungsmanagement">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Änderungsantrag erstellen
        </Button>
      </div>
    </div>
  );
}
