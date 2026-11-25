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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { StringListInput } from "../shared/string-list-input";
import { type DigitalCategoryCode } from "@/types/digital-documents";

interface Anforderung { titel: string; beschreibung: string; }

const DEFAULT_ANFORDERUNGEN: Anforderung[] = [
  { titel: "Nachweis der Fachkunde", beschreibung: "Qualifikationsnachweise der eingesetzten Mitarbeiter" },
  { titel: "Gefährdungsbeurteilung", beschreibung: "Gefährdungsbeurteilung für die geplanten Tätigkeiten" },
  { titel: "Versicherungsnachweis", beschreibung: "Nachweis über Betriebs- und Berufshaftpflichtversicherung" },
  { titel: "Unterweisungsnachweise", beschreibung: "Nachweise über die Unterweisung der eingesetzten Mitarbeiter" },
  { titel: "PSA-Ausstattung", beschreibung: "Nachweis der erforderlichen persönlichen Schutzausrüstung" },
  { titel: "Arbeitsmedizinische Vorsorge", beschreibung: "Nachweise über arbeitsmedizinische Vorsorgeuntersuchungen" },
];

const DEFAULT_REGELN = [
  "Betreten des Betriebsgeländes nur nach Anmeldung beim Empfang",
  "Sicherheitsunterweisung vor Arbeitsbeginn ist Pflicht",
  "Persönliche Schutzausrüstung ist im gesamten Produktionsbereich zu tragen",
  "Rauchverbot im gesamten Betriebsgelände",
  "Arbeitsbereich sauber und ordentlich hinterlassen",
  "Abfälle sachgerecht trennen und entsorgen",
  "Unfälle und Beinahe-Unfälle sofort dem Auftraggeber melden",
  "Brandschutzeinrichtungen nicht blockieren",
  "Flucht- und Rettungswege freihalten",
  "Geschwindigkeitsbegrenzung auf dem Betriebsgelände beachten",
];

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  datum: z.string().min(1, "Datum ist erforderlich"),
  fristTage: z.string(),
  geschaeftsfuehrer: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
interface Company { id: string; name: string; }

interface PQ01FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function PQ01Form({ initialData }: PQ01FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};

  const [anforderungen, setAnforderungen] = useState<Anforderung[]>(
    () => (fd.anforderungen as Anforderung[]) || [...DEFAULT_ANFORDERUNGEN]
  );
  const [regeln, setRegeln] = useState<string[]>(
    () => (fd.regeln as string[]) || [...DEFAULT_REGELN]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      fristTage: (fd.fristTage as string)?.toString() ?? "14",
      geschaeftsfuehrer: (fd.geschaeftsfuehrer as string) ?? "",
    },
  });

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) { const data = await res.json(); setCompanies(Array.isArray(data) ? data : data.data || []); }
      } catch (error) { console.error("Error:", error); }
    }
    fetchCompanies();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";
      const payload = {
        companyId: values.companyId, categoryCode: "PQ01",
        title: `Fremdfirmen-Information — ${companyName}`,
        formData: {
          datum: values.datum,
          fristTage: parseInt(values.fristTage) || 14,
          anforderungen: anforderungen.filter((a) => a.titel.trim()),
          regeln: regeln.filter((r) => r.trim()),
          geschaeftsfuehrer: values.geschaeftsfuehrer,
        },
        validFrom: values.datum || null,
      };
      const url = isEditMode ? `/api/digital-documents/${initialData.id}` : "/api/digital-documents";
      const res = await fetch(url, { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || "Fehler"); }
      const data = await res.json();
      router.push(`/dokumente/digital/${data.id}`); router.refresh();
    } catch (error) { alert(error instanceof Error ? error.message : "Fehler"); }
    finally { setIsSubmitting(false); }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Fremdfirmen — Anforderung + Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="companyId" render={({ field }) => (
                <FormItem><FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Betrieb" /></SelectTrigger></FormControl>
                    <SelectContent>{companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="datum" render={({ field }) => (
                <FormItem><FormLabel>Datum <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="fristTage" render={({ field }) => (
                <FormItem><FormLabel>Frist (Tage)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="geschaeftsfuehrer" render={({ field }) => (
                <FormItem><FormLabel>Geschäftsführer/in</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Anforderungen ({anforderungen.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {anforderungen.map((anf, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-sm font-medium mt-2 w-6 text-center">{idx + 1}.</span>
                <div className="flex-1 space-y-1">
                  <Input value={anf.titel} onChange={(e) => setAnforderungen(anforderungen.map((a, i) => (i === idx ? { ...a, titel: e.target.value } : a)))} placeholder="Titel" className="h-8 font-medium" />
                  <Textarea value={anf.beschreibung} onChange={(e) => setAnforderungen(anforderungen.map((a, i) => (i === idx ? { ...a, beschreibung: e.target.value } : a)))} placeholder="Beschreibung" rows={1} className="min-h-[2rem]" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0" onClick={() => setAnforderungen(anforderungen.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setAnforderungen([...anforderungen, { titel: "", beschreibung: "" }])} className="gap-1">
              <Plus className="h-4 w-4" /> Anforderung hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sicherheitsregeln ({regeln.length})</CardTitle></CardHeader>
          <CardContent>
            <StringListInput items={regeln} onChange={setRegeln} placeholder="Regel eingeben" addLabel="Regel hinzufügen" />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Wird gespeichert..." : isEditMode ? "Aktualisieren" : "Dokument erstellen"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Abbrechen</Button>
        </div>
      </form>
    </Form>
  );
}
