"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  Calendar,
  Loader2,
} from "lucide-react";

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
  city: string | null;
}

interface InspectionTemplate {
  id: string;
  name: string;
}

const typeOptions = [
  { value: "INITIAL", label: "Erstbegehung", description: "Erste Begehung eines neuen Betriebs" },
  { value: "REGULAR", label: "Regelbegehung", description: "Regelmäßige jährliche Begehung" },
  { value: "FOLLOWUP", label: "Nachkontrolle", description: "Überprüfung offener Befunde" },
  { value: "SPECIAL", label: "Sonderbegehung", description: "Anlassbezogene Begehung" },
];

export default function NeueBegehungPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [awsTemplate, setAwsTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [inspectionType, setInspectionType] = useState("REGULAR");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendees, setAttendees] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCompanies(data.filter((c) => c.isActive !== false));
      })
      .catch(() => {});

    fetch("/api/inspection-templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const aws = data.find((t: InspectionTemplate) =>
            t.name.includes("AWS") || t.name.includes("A00")
          );
          if (aws) setAwsTemplate(aws);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!companyId || !inspectionType || !inspectionDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          templateId: awsTemplate?.id || null,
          inspectionType,
          inspectionDate,
          attendees: attendees || null,
          generalNotes: generalNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      const inspection = await res.json();
      router.push(`/begehungen/${inspection.id}`);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Erstellen der Begehung.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/begehungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Begehung</h1>
        <p className="text-muted-foreground">
          Vorlage: AWS Begehungsvorlage (A00–XYZ03)
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gab es für den Betrieb schon eine digitale Begehung, werden Daten, Namen und Bemerkungen
          übernommen und alle Antworten (JA / NEIN / n.r.) samt offenen Befunden vorausgewählt. Du
          tippst nur an, was sich geändert hat. Abgelaufene Prüftermine werden automatisch zum Mangel.
        </p>
      </div>

      {/* Company */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Betrieb
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Betrieb auswählen" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.city ? ` (${c.city})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Type + Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Art & Datum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {typeOptions.map((type) => (
              <div
                key={type.value}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  inspectionType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => setInspectionType(type.value)}
              >
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Begehungsdatum
            </Label>
            <Input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Optional info */}
      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Informationen</CardTitle>
          <CardDescription>Optional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Teilnehmer</Label>
            <Textarea
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="z.B. Herr Müller (GF), Frau Schmidt (SiBe)..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Allgemeine Anmerkungen</Label>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Optionale Anmerkungen..."
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!companyId || !inspectionType || !inspectionDate || loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird erstellt...</>
            ) : (
              "Begehung starten"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
