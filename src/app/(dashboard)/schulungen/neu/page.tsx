"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { TrainingSection } from "@/types/training";
import { SectionEditor } from "@/components/trainings/section-editor";
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

interface TrainingTemplate {
  id: string;
  title: string;
  trainingType: string;
  description: string | null;
  legalBasis: string | null;
  content: string | null;
  sections: TrainingSection[] | null;
  recurrenceMonths: number | null;
  durationMinutes: number | null;
}

const trainingTypes = [
  { value: "ERSTUNTERWEISUNG", label: "Erstunterweisung" },
  { value: "UNTERWEISUNG", label: "Unterweisung" },
  { value: "FORTBILDUNG", label: "Fortbildung" },
  { value: "ZERTIFIKAT", label: "Zertifikat" },
  { value: "ERSTE_HILFE", label: "Erste Hilfe" },
  { value: "BRANDSCHUTZ", label: "Brandschutz" },
  { value: "GEFAHRSTOFF", label: "Gefahrstoff" },
  { value: "PSA", label: "PSA" },
  { value: "MASCHINE", label: "Maschine" },
  { value: "ELEKTRO", label: "Elektro" },
  { value: "HOEHENARBEIT", label: "Höhenarbeit" },
  { value: "STAPLERFAHRER", label: "Staplerfahrer" },
  { value: "BILDSCHIRMARBEIT", label: "Bildschirmarbeit" },
  { value: "SONSTIG", label: "Sonstig" },
];

export default function NeueSchulungPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [description, setDescription] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [content, setContent] = useState("");
  const [instructor, setInstructor] = useState("");
  const [location, setLocation] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [recurrenceMonths, setRecurrenceMonths] = useState("");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<TrainingSection[]>([]);

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

    fetch("/api/training-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTemplates(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "__none__") return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setTrainingType(template.trainingType);
      setDescription(template.description || "");
      setLegalBasis(template.legalBasis || "");
      setContent(template.content || "");
      setRecurrenceMonths(
        template.recurrenceMonths ? String(template.recurrenceMonths) : ""
      );
      setDuration(
        template.durationMinutes ? String(template.durationMinutes) : ""
      );
      setSections(
        Array.isArray(template.sections) ? template.sections : []
      );
    }
  };

  const handleSubmit = async () => {
    if (!companyId || !title || !trainingType) return;
    setLoading(true);

    const payload = {
      companyId,
      templateId: selectedTemplate && selectedTemplate !== "__none__" ? selectedTemplate : null,
      title,
      trainingType,
      description: description || null,
      legalBasis: legalBasis || null,
      content: content || null,
      instructor: instructor || null,
      location: location || null,
      trainingDate: trainingDate || null,
      startTime: startTime || null,
      duration: duration ? parseInt(duration) : null,
      recurrenceMonths: recurrenceMonths ? parseInt(recurrenceMonths) : null,
      notes: notes || null,
      sections: sections.length > 0 ? sections : null,
    };

    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const training = await res.json();
      router.push(`/schulungen/${training.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && title && trainingType;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/schulungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Schulung</h1>
        <p className="text-muted-foreground">
          Schulung oder Unterweisung anlegen
        </p>
      </div>

      {/* Template Selection */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vorlage</CardTitle>
            <CardDescription>
              Optional: Vorlage auswählen, um Felder automatisch auszufüllen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Schulungsvorlage</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Vorlage</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

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
              placeholder="z.B. Jährliche Brandschutzunterweisung"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Schulungstyp <span className="text-destructive">*</span></Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rechtsgrundlage</Label>
              <Input
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                placeholder="z.B. ArbSchG § 12, DGUV Vorschrift 1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung der Schulung..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inhalt */}
      <Card>
        <CardHeader>
          <CardTitle>Schulungsinhalt</CardTitle>
          <CardDescription>
            {sections.length > 0
              ? `${sections.length} Abschnitte aus Vorlage geladen — können bearbeitet werden`
              : "Inhalt / Agenda der Schulung"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length > 0 ? (
            <SectionEditor sections={sections} onChange={setSections} />
          ) : (
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Schulungsinhalte, Agenda, Themen..."
                rows={8}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Termin & Ort */}
      <Card>
        <CardHeader>
          <CardTitle>Termin & Ort</CardTitle>
          <CardDescription>Wann und wo findet die Schulung statt?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Uhrzeit</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dauer (Minuten)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="z.B. 60"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Wiederholungsturnus (Monate)</Label>
              <Input
                type="number"
                value={recurrenceMonths}
                onChange={(e) => setRecurrenceMonths(e.target.value)}
                placeholder="z.B. 12"
                min={1}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Referent / Unterweiser</Label>
              <Input
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Name des Referenten"
              />
            </div>
            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Schulungsraum, Halle 2..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anmerkungen</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Weitere Anmerkungen..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/schulungen">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Schulung erstellen
        </Button>
      </div>
    </div>
  );
}
