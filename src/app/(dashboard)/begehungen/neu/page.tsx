"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
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

const typeOptions = [
  {
    value: "INITIAL",
    label: "Erstbegehung",
    description: "Erste Begehung eines neuen Betriebs",
  },
  {
    value: "REGULAR",
    label: "Regelbegehung",
    description: "Regelmäßige Begehung",
  },
  {
    value: "FOLLOWUP",
    label: "Nachkontrolle",
    description: "Überprüfung offener Befunde",
  },
  {
    value: "SPECIAL",
    label: "Sonderbegehung",
    description: "Anlassbezogene Begehung",
  },
];

export default function NeueBegehungPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendees, setAttendees] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(
            data
              .filter((c: Company & { isActive?: boolean }) => c.isActive !== false)
              .map((c: Company) => ({
                id: c.id,
                name: c.name,
                city: c.city,
              }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          templateId: "universal-template",
          inspectionType,
          inspectionDate,
          attendees: attendees || null,
          generalNotes: generalNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Erstellen");
      }

      const inspection = await res.json();
      router.push(`/begehungen/${inspection.id}`);
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert(
        error instanceof Error ? error.message : "Fehler beim Erstellen"
      );
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = !!companyId;
  const canProceedStep2 = !!inspectionType && !!inspectionDate;

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
          Schritt {step} von 3
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Company Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Betrieb auswählen
            </CardTitle>
            <CardDescription>
              Welcher Betrieb soll begangen werden?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Betrieb auswählen" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                    {company.city && ` (${company.city})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Type and Date */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Art der Begehung
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
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Additional Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Zusätzliche Informationen</CardTitle>
            <CardDescription>
              Optional: Teilnehmer und allgemeine Anmerkungen
            </CardDescription>
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
                placeholder="Optionale Anmerkungen zur Begehung..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Begehung starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
