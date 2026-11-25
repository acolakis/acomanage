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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ChecklistInput } from "../shared/checklist-input";
import { type DigitalCategoryCode } from "@/types/digital-documents";

const DEFAULT_VOR = [
  "Brennbare Stoffe und Gegenstände entfernt/abgedeckt",
  "Brandschutzeinrichtungen überprüft und einsatzbereit",
  "Löschmittel bereitgestellt",
  "Umgebung auf Brandgefahren kontrolliert",
  "Öffnungen, Fugen und Ritzen abgedichtet",
];

const DEFAULT_WAEHREND = [
  "Funkenflug überwachen",
  "Brandwache aufgestellt",
  "Löschmittel griffbereit",
];

const DEFAULT_NACH = [
  "Arbeitsstelle auf Glutnester kontrolliert",
  "Brandwache für ___ Stunden aufgestellt",
  "Löschmittel verbleiben vor Ort",
  "Wiederholte Kontrolle nach Arbeitsende",
];

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  ausfuehrender: z.string().min(1, "Ausführender ist erforderlich"),
  ausfuehrendeFirma: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
  arbeitsort: z.string().min(1, "Arbeitsort ist erforderlich"),
  arbeitsauftrag: z.string().min(1, "Arbeitsauftrag ist erforderlich"),
  brandwacheStunden: z.string(),
  aufsichtsfuehrender: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
interface Company { id: string; name: string; }

interface S06FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function S06Form({ initialData }: S06FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};

  const [massnahmenVor, setMassnahmenVor] = useState(() =>
    (fd.massnahmenVor as Array<{ label: string; checked: boolean }>) || DEFAULT_VOR.map((l) => ({ label: l, checked: false }))
  );
  const [massnahmenWaehrend, setMassnahmenWaehrend] = useState(() =>
    (fd.massnahmenWaehrend as Array<{ label: string; checked: boolean }>) || DEFAULT_WAEHREND.map((l) => ({ label: l, checked: false }))
  );
  const [massnahmenNach, setMassnahmenNach] = useState(() =>
    (fd.massnahmenNach as Array<{ label: string; checked: boolean }>) || DEFAULT_NACH.map((l) => ({ label: l, checked: false }))
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      ausfuehrender: (fd.ausfuehrender as string) ?? "",
      ausfuehrendeFirma: (fd.ausfuehrendeFirma as string) ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      arbeitsort: (fd.arbeitsort as string) ?? "",
      arbeitsauftrag: (fd.arbeitsauftrag as string) ?? "",
      brandwacheStunden: (fd.brandwacheStunden as string) ?? "",
      aufsichtsfuehrender: (fd.aufsichtsfuehrender as string) ?? "",
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
        companyId: values.companyId,
        categoryCode: "S06",
        title: `Feuererlaubnisschein — ${companyName} — ${values.datum}`,
        formData: {
          ...values,
          massnahmenVor, massnahmenWaehrend, massnahmenNach,
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
          <CardHeader><CardTitle>Feuererlaubnisschein</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="companyId" render={({ field }) => (
                <FormItem><FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Betrieb auswählen" /></SelectTrigger></FormControl>
                    <SelectContent>{companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="datum" render={({ field }) => (
                <FormItem><FormLabel>Datum <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="ausfuehrender" render={({ field }) => (
                <FormItem><FormLabel>Ausführender <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ausfuehrendeFirma" render={({ field }) => (
                <FormItem><FormLabel>Firma des Ausführenden</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="arbeitsort" render={({ field }) => (
                <FormItem><FormLabel>Arbeitsort <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="arbeitsauftrag" render={({ field }) => (
                <FormItem><FormLabel>Arbeitsauftrag <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="aufsichtsfuehrender" render={({ field }) => (
                <FormItem><FormLabel>Aufsichtsführender</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="brandwacheStunden" render={({ field }) => (
                <FormItem><FormLabel>Brandwache (Stunden)</FormLabel><FormControl><Input placeholder="z.B. 2" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Maßnahmen VOR Beginn</CardTitle></CardHeader>
          <CardContent><ChecklistInput items={massnahmenVor} onChange={setMassnahmenVor} addLabel="Maßnahme hinzufügen" /></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Maßnahmen WÄHREND der Arbeiten</CardTitle></CardHeader>
          <CardContent><ChecklistInput items={massnahmenWaehrend} onChange={setMassnahmenWaehrend} addLabel="Maßnahme hinzufügen" /></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Maßnahmen NACH den Arbeiten</CardTitle></CardHeader>
          <CardContent><ChecklistInput items={massnahmenNach} onChange={setMassnahmenNach} addLabel="Maßnahme hinzufügen" /></CardContent>
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
