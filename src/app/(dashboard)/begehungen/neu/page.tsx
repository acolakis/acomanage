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
  FileText,
  Check,
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
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  city: string | null;
  industry?: { id: string; code: string; name: string } | null;
}

interface InspectionTemplate {
  id: string;
  name: string;
  description: string | null;
  industryId: string | null;
  industry?: { id: string; code: string; name: string } | null;
  sections: {
    id: string;
    title: string;
    items: { id: string; label: string }[];
  }[];
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

const TOTAL_STEPS = 4;

export default function NeueBegehungPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendees, setAttendees] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Fetch companies on mount
  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(
            data.filter((c: Company & { isActive?: boolean }) => c.isActive !== false)
          );
        }
      })
      .catch(() => {});
  }, []);

  // Fetch templates on mount
  useEffect(() => {
    fetch("/api/inspection-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter out legacy template
          setTemplates(data.filter((t: InspectionTemplate) => t.id !== "universal-template"));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-select template when company changes
  useEffect(() => {
    if (!companyId || templates.length === 0) return;

    const company = companies.find((c) => c.id === companyId);
    if (!company?.industry) return;

    // Find template matching company's industry
    const matchingTemplate = templates.find(
      (t) => t.industryId === company.industry?.id
    );
    if (matchingTemplate) {
      setTemplateId(matchingTemplate.id);
    }
  }, [companyId, companies, templates]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const totalItems = selectedTemplate?.sections.reduce(
    (sum, s) => sum + s.items.length,
    0
  ) || 0;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          templateId: templateId || null,
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
  const canProceedStep2 = !!templateId;
  const canProceedStep3 = !!inspectionType && !!inspectionDate;

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
          Schritt {step} von {TOTAL_STEPS}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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

      {/* Step 2: Template Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Vorlage auswählen
            </CardTitle>
            <CardDescription>
              Wählen Sie die Checklisten-Vorlage für diese Begehung.
              {companies.find((c) => c.id === companyId)?.industry && (
                <> Die passende Vorlage für die Branche <strong>{companies.find((c) => c.id === companyId)?.industry?.name}</strong> wurde vorausgewählt.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {templates.map((tmpl) => {
                const itemCount = tmpl.sections.reduce(
                  (sum, s) => sum + s.items.length,
                  0
                );
                const isSelected = templateId === tmpl.id;
                const isRecommended =
                  tmpl.industryId ===
                  companies.find((c) => c.id === companyId)?.industry?.id;

                return (
                  <div
                    key={tmpl.id}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => setTemplateId(tmpl.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tmpl.name}</p>
                          {isRecommended && (
                            <Badge variant="secondary" className="text-xs">
                              Empfohlen
                            </Badge>
                          )}
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tmpl.sections.length} Sektionen, {itemCount} Prüfpunkte
                        </p>
                        {tmpl.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tmpl.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTemplate && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Enthaltene Sektionen:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.sections.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.title} ({s.items.length})
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Gesamt: {totalItems} Prüfpunkte
                </p>
              </div>
            )}

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

      {/* Step 3: Type and Date */}
      {step === 3 && (
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
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Additional Details */}
      {step === 4 && (
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
              <Button variant="outline" onClick={() => setStep(3)}>
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
