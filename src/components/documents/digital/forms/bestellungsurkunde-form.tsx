"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StringListInput } from "../shared/string-list-input";
import {
  CATEGORY_META,
  type DigitalCategoryCode,
} from "@/types/digital-documents";

const RECHTSGRUNDLAGEN: Record<string, string> = {
  B01: "§ 6 ASiG, DGUV Vorschrift 2",
  S02: "§ 10 ArbSchG, ASR A2.2, DGUV Information 205-023",
  W01: "§ 26 DGUV Vorschrift 1, § 10 ArbSchG",
  A04: "§ 2 Abs. 7 BetrSichV, TRBS 1203",
};

const S02_DEFAULT_PFLICHTEN = [
  "Kontrolle der Brandschutzeinrichtungen im zugewiesenen Bereich",
  "Vorbeugender Brandschutz — Beseitigung von Brandgefahren",
  "Bedienung der Feuerlöscheinrichtungen zur Bekämpfung von Entstehungsbränden",
  "Einweisung und Unterstützung bei der Evakuierung",
  "Zusammenarbeit mit der Feuerwehr",
];

const W01_DEFAULT_PFLICHTEN = [
  "Erste-Hilfe-Leistung bei Unfällen und akuten Erkrankungen",
  "Regelmäßige Kontrolle der Erste-Hilfe-Materialien",
  "Dokumentation der Erste-Hilfe-Leistungen im Verbandbuch",
  "Teilnahme an regelmäßigen Fortbildungen (alle 2 Jahre)",
];

const A04_DEFAULT_PFLICHTEN_LEITER = [
  "Regelmäßige Prüfung aller Leitern und Tritte gemäß BetrSichV",
  "Dokumentation der Prüfungen im Prüfbuch",
  "Sperrung und Aussonderung mangelhafter Leitern",
  "Beratung bei der Beschaffung neuer Leitern",
  "Unterweisung der Beschäftigten im Umgang mit Leitern",
];

const A04_DEFAULT_PFLICHTEN_REGAL = [
  "Regelmäßige Prüfung aller Regale und Lagereinrichtungen gemäß DIN EN 15635",
  "Dokumentation der Prüfungen im Prüfbuch",
  "Sperrung und Kennzeichnung beschädigter Regale",
  "Beratung bei der Beschaffung und Aufstellung neuer Regale",
  "Unterweisung der Beschäftigten im Umgang mit Regalanlagen",
];

function getDefaultPflichten(categoryCode: string, pruefgegenstand?: string): string[] {
  switch (categoryCode) {
    case "S02": return [...S02_DEFAULT_PFLICHTEN];
    case "W01": return [...W01_DEFAULT_PFLICHTEN];
    case "A04": return pruefgegenstand === "Regale" ? [...A04_DEFAULT_PFLICHTEN_REGAL] : [...A04_DEFAULT_PFLICHTEN_LEITER];
    default: return [];
  }
}

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  personName: z.string().min(1, "Name ist erforderlich"),
  personPosition: z.string(),
  personQualifications: z.string(),
  personDepartment: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
  rechtsgrundlage: z.string(),
  // B01-specific
  sifaBuero: z.string(),
  sifaBueroAdresse: z.string(),
  sifaTelefon: z.string(),
  sifaMobil: z.string(),
  einsatzstunden: z.string(),
  startDatum: z.string(),
  // A04-specific
  pruefgegenstand: z.string(),
  pruefintervall: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: string;
  name: string;
}

interface BestellungsurkundeFormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function BestellungsurkundeForm({
  categoryCode,
  initialData,
}: BestellungsurkundeFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const fd = initialData?.formData || {};
  const person = (fd.person as Record<string, string>) || {};

  const [pflichten, setPflichten] = useState<string[]>(
    () => (fd.pflichten as string[]) || getDefaultPflichten(categoryCode, person.pruefgegenstand as string)
  );

  const meta = CATEGORY_META[categoryCode];
  const isB01 = categoryCode === "B01";
  const isA04 = categoryCode === "A04";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      personName: person.name ?? "",
      personPosition: person.position ?? "",
      personQualifications: person.qualifications ?? "",
      personDepartment: person.department ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      rechtsgrundlage: (fd.rechtsgrundlage as string) ?? RECHTSGRUNDLAGEN[categoryCode] ?? "",
      sifaBuero: (fd.sifaBuero as string) ?? "",
      sifaBueroAdresse: (fd.sifaBueroAdresse as string) ?? "",
      sifaTelefon: (fd.sifaTelefon as string) ?? "",
      sifaMobil: (fd.sifaMobil as string) ?? "",
      einsatzstunden: (fd.einsatzstunden as string) ?? "",
      startDatum: (fd.startDatum as string) ?? "",
      pruefgegenstand: (fd.pruefgegenstand as string) ?? "Leitern",
      pruefintervall: (fd.pruefintervall as string) ?? "jährlich",
    },
  });

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(Array.isArray(data) ? data : data.data || []);
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
        person: {
          name: values.personName,
          position: values.personPosition,
          qualifications: values.personQualifications,
          department: values.personDepartment,
        },
        datum: values.datum,
        rechtsgrundlage: values.rechtsgrundlage,
        pflichten: pflichten.filter((p) => p.trim()),
        ...(isB01 && {
          sifaBuero: values.sifaBuero,
          sifaBueroAdresse: values.sifaBueroAdresse,
          sifaTelefon: values.sifaTelefon,
          sifaMobil: values.sifaMobil,
          einsatzstunden: values.einsatzstunden,
          startDatum: values.startDatum,
        }),
        ...(isA04 && {
          pruefgegenstand: values.pruefgegenstand,
          pruefintervall: values.pruefintervall,
        }),
      };

      const payload = {
        companyId: values.companyId,
        categoryCode,
        title: `${meta?.label || categoryCode} — ${companies.find((c) => c.id === values.companyId)?.name || ""} — ${values.personName}`,
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
        {/* Company & Date */}
        <Card>
          <CardHeader>
            <CardTitle>{meta?.label || "Bestellungsurkunde"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Betrieb auswählen" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                    <FormLabel>Datum <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Person */}
        <Card>
          <CardHeader>
            <CardTitle>Angaben zur Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="personName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="Vor- und Nachname" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl><Input placeholder="Position im Unternehmen" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="personDepartment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abteilung</FormLabel>
                    <FormControl><Input placeholder="Abteilung" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personQualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifikationen</FormLabel>
                    <FormControl><Input placeholder="z.B. Ausbildung Ersthelfer 2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="rechtsgrundlage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rechtsgrundlage</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* B01: SIFA Details */}
        {isB01 && (
          <Card>
            <CardHeader>
              <CardTitle>SIFA-Büro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sifaBuero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Büro-Name</FormLabel>
                      <FormControl><Input placeholder="z.B. AcoManage GmbH" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sifaBueroAdresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Büro-Adresse</FormLabel>
                      <FormControl><Input placeholder="Straße, PLZ Ort" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="sifaTelefon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl><Input placeholder="Tel." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sifaMobil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobil</FormLabel>
                      <FormControl><Input placeholder="Mobil" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="einsatzstunden"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einsatzstunden/Jahr</FormLabel>
                      <FormControl><Input placeholder="z.B. 40" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="startDatum"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Beginn der Bestellung</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* A04: Prüfgegenstand */}
        {isA04 && (
          <Card>
            <CardHeader>
              <CardTitle>Prüfgegenstand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pruefgegenstand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prüfgegenstand</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          setPflichten(getDefaultPflichten("A04", val));
                        }}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Leitern">Leitern und Tritte</SelectItem>
                          <SelectItem value="Regale">Regale und Lagereinrichtungen</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pruefintervall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prüfintervall</FormLabel>
                      <FormControl><Input placeholder="z.B. jährlich" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duties */}
        <Card>
          <CardHeader>
            <CardTitle>Pflichten und Aufgaben</CardTitle>
          </CardHeader>
          <CardContent>
            <StringListInput
              items={pflichten}
              onChange={setPflichten}
              placeholder="Pflicht beschreiben"
              addLabel="Pflicht hinzufügen"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Wird gespeichert..." : isEditMode ? "Aktualisieren" : "Dokument erstellen"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Form>
  );
}
