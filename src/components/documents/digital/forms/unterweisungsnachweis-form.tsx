"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ParticipantTableInput } from "../shared/participant-table-input";
import { ChecklistInput } from "../shared/checklist-input";
import { StringListInput } from "../shared/string-list-input";
import {
  CATEGORY_META,
  type DigitalCategoryCode,
} from "@/types/digital-documents";

// Default topics per category
const G01_DEFAULT_TOPICS = [
  "Verhalten im Brandfall / Brandschutz",
  "Flucht- und Rettungswege",
  "Erste Hilfe / Ersthelfer",
  "Sicherheitsbeauftragte / Fachkraft für Arbeitssicherheit",
  "Persönliche Schutzausrüstung (PSA)",
  "Gefahrstoffe — allgemeine Hinweise",
  "Verkehrswege / Ordnung und Sauberkeit",
  "Elektrische Anlagen und Betriebsmittel",
  "Verhalten bei Unfällen / Unfallmeldung",
  "Allgemeine Verhaltensregeln am Arbeitsplatz",
];

const S02_EVAK_DEFAULT_TOPICS = [
  "Alarmierung (optisch/akustisch) — Erkennung und Reaktion",
  "Flucht- und Rettungswege — Kennzeichnung und Nutzung",
  "Sammelplatz — Standort und Verhalten",
  "Evakuierungshelfer — Aufgaben und Zuständigkeiten",
  "Vollständigkeitskontrolle am Sammelplatz",
  "Verhalten bei Verrauchung / Sichtbehinderung",
  "Hilfsbedürftige Personen — Unterstützung bei der Evakuierung",
  "Aufzüge im Brandfall nicht benutzen",
  "Türen und Fenster schließen",
  "Rückkehr ins Gebäude nur nach Freigabe",
];

const PQ02_UW_DEFAULT_TOPICS = [
  "Arbeitsschutzinformation gelesen und verstanden",
  "Betriebliche Sicherheitsregeln bekannt",
  "Flucht- und Rettungswege bekannt",
  "Ansprechpartner für Arbeitsschutz bekannt",
  "Persönliche Schutzausrüstung vorhanden",
];

const RECHTSGRUNDLAGEN: Record<string, string> = {
  G01: "§ 12 ArbSchG, § 4 DGUV Vorschrift 1, § 12 BetrSichV",
  G05: "§ 12 ArbSchG, § 12 BetrSichV",
  G06: "§ 12 ArbSchG, § 4 DGUV Vorschrift 1",
  IJ07: "§ 14 GefStoffV, § 12 ArbSchG",
  S02_EVAK: "§ 10 ArbSchG, ASR A2.3",
  PQ02_UW: "§ 8 ArbSchG, § 6 DGUV Vorschrift 1",
};

const INHALT_TITEL: Record<string, string> = {
  G01: "Erstinformation — Themen",
  G05: "Maschinenerstunterweisung",
  G06: "Anlassbezogene Unterweisung",
  IJ07: "Gefahrstofferstunterweisung",
  S02_EVAK: "Evakuierungsübung — Inhalte",
  PQ02_UW: "Fremdfirmen-Unterweisung",
};

function getDefaultTopics(categoryCode: string) {
  switch (categoryCode) {
    case "G01":
      return G01_DEFAULT_TOPICS.map((label) => ({ label, checked: false }));
    case "S02_EVAK":
      return S02_EVAK_DEFAULT_TOPICS.map((label) => ({ label, checked: false }));
    case "PQ02_UW":
      return PQ02_UW_DEFAULT_TOPICS.map((label) => ({ label, checked: false }));
    default:
      return [];
  }
}

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  unterweisendeFirma: z.string().min(1, "Unterweisende Firma ist erforderlich"),
  unterweisendeFirmaAdresse: z.string(),
  abteilung: z.string(),
  rechtsgrundlage: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
  ort: z.string(),
  unterweisenderName: z.string().min(1, "Name des Unterweisenden ist erforderlich"),
  unterweisenderPosition: z.string(),
  inhaltTitel: z.string(),
  inhaltText: z.string(),
  personName: z.string(),
  geplanteThemen: z.string(),
  naechsterTermin: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: string;
  name: string;
}

interface UnterweisungsnachweisFormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function UnterweisungsnachweisForm({
  categoryCode,
  initialData,
}: UnterweisungsnachweisFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Non-form-controlled state for complex fields
  const [topics, setTopics] = useState<Array<{ label: string; checked: boolean }>>(
    () => {
      if (initialData?.formData?.topics) {
        return initialData.formData.topics as Array<{ label: string; checked: boolean }>;
      }
      return getDefaultTopics(categoryCode);
    }
  );

  const [spezifischeItems, setSpezifischeItems] = useState<string[]>(
    () => (initialData?.formData?.spezifischeItems as string[]) || []
  );

  const [participants, setParticipants] = useState<Array<{ name: string; department?: string }>>(
    () =>
      (initialData?.formData?.participants as Array<{ name: string; department?: string }>) || [
        { name: "", department: "" },
      ]
  );

  const meta = CATEGORY_META[categoryCode];
  const showPersonName = categoryCode === "G05" || categoryCode === "IJ07";
  const showSpezifischeItems = categoryCode === "G05" || categoryCode === "IJ07";
  const showTopics = ["G01", "S02_EVAK", "PQ02_UW"].includes(categoryCode);

  const fd = initialData?.formData || {};

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      unterweisendeFirma: (fd.unterweisendeFirma as string) ?? "",
      unterweisendeFirmaAdresse: (fd.unterweisendeFirmaAdresse as string) ?? "",
      abteilung: (fd.abteilung as string) ?? "",
      rechtsgrundlage: (fd.rechtsgrundlage as string) ?? RECHTSGRUNDLAGEN[categoryCode] ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      ort: (fd.ort as string) ?? "",
      unterweisenderName: (fd.unterweisenderName as string) ?? "",
      unterweisenderPosition: (fd.unterweisenderPosition as string) ?? "",
      inhaltTitel: (fd.inhaltTitel as string) ?? INHALT_TITEL[categoryCode] ?? "",
      inhaltText: (fd.inhaltText as string) ?? "",
      personName: (fd.personName as string) ?? "",
      geplanteThemen: (fd.geplanteThemen as string) ?? "",
      naechsterTermin: (fd.naechsterTermin as string) ?? "",
    },
  });

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data || [];
          setCompanies(list);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    }
    fetchCompanies();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const formData = {
        unterweisendeFirma: values.unterweisendeFirma,
        unterweisendeFirmaAdresse: values.unterweisendeFirmaAdresse,
        abteilung: values.abteilung,
        rechtsgrundlage: values.rechtsgrundlage,
        datum: values.datum,
        ort: values.ort,
        unterweisenderName: values.unterweisenderName,
        unterweisenderPosition: values.unterweisenderPosition,
        inhaltTitel: values.inhaltTitel,
        inhaltText: values.inhaltText,
        topics,
        spezifischeItems: spezifischeItems.filter((s) => s.trim()),
        personName: values.personName,
        participants: participants.filter((p) => p.name.trim()),
        geplanteThemen: values.geplanteThemen,
        naechsterTermin: values.naechsterTermin,
      };

      const payload = {
        companyId: values.companyId,
        categoryCode,
        title: `${meta?.label || categoryCode} — ${companies.find((c) => c.id === values.companyId)?.name || ""}`,
        formData,
        validFrom: values.datum || null,
      };

      const url = isEditMode
        ? `/api/digital-documents/${initialData.id}`
        : "/api/digital-documents";

      const res = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Fehler beim Speichern");
      }

      const data = await res.json();
      router.push(`/dokumente/digital/${data.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header info */}
        <Card>
          <CardHeader>
            <CardTitle>{meta?.label || "Unterweisungsnachweis"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Betrieb <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Betrieb auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="datum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Datum <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unterweisendeFirma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unterweisende Firma <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. AcoManage GmbH" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unterweisendeFirmaAdresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse der unterweisenden Firma</FormLabel>
                    <FormControl>
                      <Input placeholder="Straße, PLZ Ort" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="abteilung"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abteilung</FormLabel>
                    <FormControl>
                      <Input placeholder="Abteilung" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ort</FormLabel>
                    <FormControl>
                      <Input placeholder="Schulungsort" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rechtsgrundlage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rechtsgrundlage</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. § 12 ArbSchG" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unterweisenderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unterweisender (Name) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Name des Unterweisenden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unterweisenderPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Fachkraft für Arbeitssicherheit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        <Card>
          <CardHeader>
            <CardTitle>Inhalt der Unterweisung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="inhaltTitel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel des Inhalts</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* G05/IJ07: Person name */}
            {showPersonName && (
              <FormField
                control={form.control}
                name="personName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {categoryCode === "G05"
                        ? "Herr/Frau ___ wurde an nachfolgenden Maschinen unterwiesen"
                        : "Herr/Frau ___ wurde an nachfolgenden Gefahrstoffen unterwiesen"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Herr/Frau Mustermann" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* G05/IJ07: Specific items */}
            {showSpezifischeItems && (
              <div>
                <label className="text-sm font-medium">
                  {categoryCode === "G05" ? "Maschinen / Anlagen" : "Gefahrstoffe"}
                </label>
                <div className="mt-2">
                  <StringListInput
                    items={spezifischeItems}
                    onChange={setSpezifischeItems}
                    placeholder={categoryCode === "G05" ? "Maschinenbezeichnung" : "Gefahrstoffbezeichnung"}
                    addLabel={categoryCode === "G05" ? "Maschine hinzufügen" : "Gefahrstoff hinzufügen"}
                  />
                </div>
              </div>
            )}

            {/* G01/S02_EVAK/PQ02_UW: Topics checklist */}
            {showTopics && (
              <div>
                <label className="text-sm font-medium">Themen</label>
                <div className="mt-2">
                  <ChecklistInput
                    items={topics}
                    onChange={setTopics}
                    addLabel="Thema hinzufügen"
                  />
                </div>
              </div>
            )}

            {/* Free text content (always available) */}
            <FormField
              control={form.control}
              name="inhaltText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Freitext / Anweisungen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zusätzliche Anweisungen oder Inhalte..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle>Teilnehmerliste</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantTableInput
              participants={participants}
              onChange={setParticipants}
              showDepartment
            />
          </CardContent>
        </Card>

        {/* Next topic / follow-up */}
        <Card>
          <CardHeader>
            <CardTitle>Nächster Termin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="geplanteThemen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geplantes Thema</FormLabel>
                    <FormControl>
                      <Input placeholder="Nächstes Unterweisungsthema" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="naechsterTermin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nächster Termin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? "Wird gespeichert..."
              : isEditMode
                ? "Aktualisieren"
                : "Dokument erstellen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Abbrechen
          </Button>
        </div>
      </form>
    </Form>
  );
}
