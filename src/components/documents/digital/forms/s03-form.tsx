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
import { type DigitalCategoryCode } from "@/types/digital-documents";

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  alarmierungsText: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface Contact { rolle: string; name: string; telefon: string; durchwahl?: string; }
interface ExternalContact { stelle: string; telefon: string; }
interface Company { id: string; name: string; }

interface S03FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function S03Form({ initialData }: S03FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};

  const [kontakte, setKontakte] = useState<Contact[]>(
    () => (fd.kontakte as Contact[]) || [{ rolle: "Brandschutzbeauftragter", name: "", telefon: "", durchwahl: "" }]
  );
  const [externeKontakte, setExterneKontakte] = useState<ExternalContact[]>(
    () => (fd.externeKontakte as ExternalContact[]) || [
      { stelle: "Feuerwehr", telefon: "112" },
      { stelle: "Rettungsdienst", telefon: "112" },
      { stelle: "Polizei", telefon: "110" },
    ]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      alarmierungsText: (fd.alarmierungsText as string) ?? "Bei Brandentdeckung: Hausalarm auslösen → Notruf 112 → Löschversuch unternehmen (nur bei Entstehungsbrand) → Gebäude über Fluchtwege verlassen → Am Sammelplatz melden.",
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
        categoryCode: "S03",
        title: `Brandschutzordnung — ${companyName}`,
        formData: {
          kontakte: kontakte.filter((k) => k.name.trim()),
          externeKontakte: externeKontakte.filter((e) => e.stelle.trim()),
          alarmierungsText: values.alarmierungsText,
        },
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
          <CardHeader><CardTitle>Brandschutzordnung (Teil A + C)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="companyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Betrieb auswählen" /></SelectTrigger></FormControl>
                  <SelectContent>{companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="alarmierungsText" render={({ field }) => (
              <FormItem><FormLabel>Alarmierungsablauf</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Interne Kontakte (Teil C)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {kontakte.map((k, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto_2rem] gap-2 items-center">
                <Input value={k.rolle} onChange={(e) => { const u = [...kontakte]; u[idx] = { ...k, rolle: e.target.value }; setKontakte(u); }} placeholder="Rolle" className="h-8" />
                <Input value={k.name} onChange={(e) => { const u = [...kontakte]; u[idx] = { ...k, name: e.target.value }; setKontakte(u); }} placeholder="Name" className="h-8" />
                <Input value={k.telefon} onChange={(e) => { const u = [...kontakte]; u[idx] = { ...k, telefon: e.target.value }; setKontakte(u); }} placeholder="Telefon" className="h-8 w-28" />
                <Input value={k.durchwahl || ""} onChange={(e) => { const u = [...kontakte]; u[idx] = { ...k, durchwahl: e.target.value }; setKontakte(u); }} placeholder="DW" className="h-8 w-16" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setKontakte(kontakte.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setKontakte([...kontakte, { rolle: "", name: "", telefon: "", durchwahl: "" }])} className="gap-1"><Plus className="h-4 w-4" /> Kontakt hinzufügen</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Externe Kontakte</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {externeKontakte.map((e, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input value={e.stelle} onChange={(ev) => { const u = [...externeKontakte]; u[idx] = { ...e, stelle: ev.target.value }; setExterneKontakte(u); }} placeholder="Stelle" className="h-8 flex-1" />
                <Input value={e.telefon} onChange={(ev) => { const u = [...externeKontakte]; u[idx] = { ...e, telefon: ev.target.value }; setExterneKontakte(u); }} placeholder="Telefon" className="h-8 w-32" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExterneKontakte(externeKontakte.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setExterneKontakte([...externeKontakte, { stelle: "", telefon: "" }])} className="gap-1"><Plus className="h-4 w-4" /> Kontakt hinzufügen</Button>
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
