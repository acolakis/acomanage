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
import { StringListInput } from "../shared/string-list-input";
import { type DigitalCategoryCode } from "@/types/digital-documents";

const DEFAULT_LEITSAETZE = [
  "Die Sicherheit und Gesundheit unserer Mitarbeiterinnen und Mitarbeiter hat höchste Priorität.",
  "Wir verpflichten uns zur Einhaltung aller relevanten Arbeitsschutzvorschriften und -normen.",
  "Arbeitsschutz ist eine Führungsaufgabe und integraler Bestandteil aller betrieblichen Prozesse.",
  "Wir fördern das Sicherheitsbewusstsein aller Beschäftigten durch regelmäßige Schulungen und Unterweisungen.",
  "Gefährdungen werden systematisch ermittelt, bewertet und durch geeignete Maßnahmen minimiert.",
  "Wir streben die kontinuierliche Verbesserung unseres Arbeitsschutzmanagementsystems an.",
  "Arbeitsunfälle und arbeitsbedingte Erkrankungen sollen vermieden werden.",
  "Alle Mitarbeiterinnen und Mitarbeiter sind aufgefordert, aktiv am Arbeitsschutz mitzuwirken.",
];

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  datum: z.string().min(1, "Datum ist erforderlich"),
  geschaeftsfuehrer: z.string().min(1, "Geschäftsführer ist erforderlich"),
});

type FormValues = z.infer<typeof formSchema>;

interface Company { id: string; name: string; }

interface A01FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function A01Form({ initialData }: A01FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};

  const [leitsaetze, setLeitsaetze] = useState<string[]>(
    () => (fd.leitsaetze as string[]) || [...DEFAULT_LEITSAETZE]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      geschaeftsfuehrer: (fd.geschaeftsfuehrer as string) ?? "",
    },
  });

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) { const data = await res.json(); setCompanies(Array.isArray(data) ? data : data.data || []); }
      } catch (error) { console.error("Error fetching companies:", error); }
    }
    fetchCompanies();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";
      const payload = {
        companyId: values.companyId,
        categoryCode: "A01",
        title: `Grundsatzerklärung — ${companyName}`,
        formData: { datum: values.datum, leitsaetze: leitsaetze.filter((l) => l.trim()), geschaeftsfuehrer: values.geschaeftsfuehrer },
        validFrom: values.datum || null,
      };
      const url = isEditMode ? `/api/digital-documents/${initialData.id}` : "/api/digital-documents";
      const res = await fetch(url, { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || "Fehler beim Speichern"); }
      const data = await res.json();
      router.push(`/dokumente/digital/${data.id}`);
      router.refresh();
    } catch (error) { alert(error instanceof Error ? error.message : "Fehler beim Speichern"); }
    finally { setIsSubmitting(false); }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Grundsatzerklärung zum Arbeitsschutz</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="companyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Betrieb auswählen" /></SelectTrigger></FormControl>
                    <SelectContent>{companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="datum" render={({ field }) => (
                <FormItem><FormLabel>Datum <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="geschaeftsfuehrer" render={({ field }) => (
              <FormItem><FormLabel>Geschäftsführer/in <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leitsätze ({leitsaetze.length})</CardTitle></CardHeader>
          <CardContent>
            <StringListInput items={leitsaetze} onChange={setLeitsaetze} placeholder="Leitsatz eingeben" addLabel="Leitsatz hinzufügen" />
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
