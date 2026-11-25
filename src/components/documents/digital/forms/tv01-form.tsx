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

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  datum: z.string().min(1, "Datum ist erforderlich"),
  sicherheitsbeauftragte: z.string(),
  sifaName: z.string(), sifaMobil: z.string(), sifaAdresse: z.string(), sifaTelefon: z.string(),
  durchgangsarztName: z.string(), durchgangsarztAdresse: z.string(), durchgangsarztTelefon: z.string(),
  betriebsarztName: z.string(), betriebsarztAdresse: z.string(), betriebsarztTelefon: z.string(),
  bgName: z.string(), bgAdresse: z.string(), bgTelefon: z.string(),
  behoerdeName: z.string(), behoerdeAdresse: z.string(), behoerdeTelefon: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
interface Company { id: string; name: string; }

interface TV01FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function TV01Form({ initialData }: TV01FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};
  const sifa = (fd.sifa as Record<string, string>) || {};
  const da = (fd.durchgangsarzt as Record<string, string>) || {};
  const ba = (fd.betriebsarzt as Record<string, string>) || {};
  const bg = (fd.berufsgenossenschaft as Record<string, string>) || {};
  const beh = (fd.arbeitsschutzbehoerde as Record<string, string>) || {};

  const [ersthelfer, setErsthelfer] = useState<string[]>(
    () => (fd.ersthelfer as string[]) || [""]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      sicherheitsbeauftragte: (fd.sicherheitsbeauftragte as string) ?? "",
      sifaName: sifa.name ?? "", sifaMobil: sifa.mobil ?? "", sifaAdresse: sifa.adresse ?? "", sifaTelefon: sifa.telefon ?? "",
      durchgangsarztName: da.name ?? "", durchgangsarztAdresse: da.adresse ?? "", durchgangsarztTelefon: da.telefon ?? "",
      betriebsarztName: ba.name ?? "", betriebsarztAdresse: ba.adresse ?? "", betriebsarztTelefon: ba.telefon ?? "",
      bgName: bg.name ?? "", bgAdresse: bg.adresse ?? "", bgTelefon: bg.telefon ?? "",
      behoerdeName: beh.name ?? "", behoerdeAdresse: beh.adresse ?? "", behoerdeTelefon: beh.telefon ?? "",
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

  async function onSubmit(v: FormValues) {
    setIsSubmitting(true);
    try {
      const companyName = companies.find((c) => c.id === v.companyId)?.name || "";
      const payload = {
        companyId: v.companyId, categoryCode: "TV01",
        title: `Verhalten bei Unfällen — ${companyName}`,
        formData: {
          sicherheitsbeauftragte: v.sicherheitsbeauftragte,
          ersthelfer: ersthelfer.filter((e) => e.trim()),
          sifa: { name: v.sifaName, mobil: v.sifaMobil, adresse: v.sifaAdresse, telefon: v.sifaTelefon },
          durchgangsarzt: { name: v.durchgangsarztName, adresse: v.durchgangsarztAdresse, telefon: v.durchgangsarztTelefon },
          betriebsarzt: { name: v.betriebsarztName, adresse: v.betriebsarztAdresse, telefon: v.betriebsarztTelefon },
          berufsgenossenschaft: { name: v.bgName, adresse: v.bgAdresse, telefon: v.bgTelefon },
          arbeitsschutzbehoerde: { name: v.behoerdeName, adresse: v.behoerdeAdresse, telefon: v.behoerdeTelefon },
          unfallMeldungKontakte: [],
          datum: v.datum,
        },
        validFrom: v.datum || null,
      };
      const url = isEditMode ? `/api/digital-documents/${initialData.id}` : "/api/digital-documents";
      const res = await fetch(url, { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || "Fehler"); }
      const data = await res.json();
      router.push(`/dokumente/digital/${data.id}`); router.refresh();
    } catch (error) { alert(error instanceof Error ? error.message : "Fehler"); }
    finally { setIsSubmitting(false); }
  }

  function ContactCard({ title, nameField, adresseField, telefonField }: { title: string; nameField: string; adresseField: string; telefonField: string }) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <FormField control={form.control} name={nameField as keyof FormValues} render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name={adresseField as keyof FormValues} render={({ field }) => (
            <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name={telefonField as keyof FormValues} render={({ field }) => (
            <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Aushang — Verhalten bei Unfällen</CardTitle></CardHeader>
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
            <FormField control={form.control} name="sicherheitsbeauftragte" render={({ field }) => (
              <FormItem><FormLabel>Sicherheitsbeauftragte/r</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div><label className="text-sm font-medium">Ersthelfer</label><div className="mt-2"><StringListInput items={ersthelfer} onChange={setErsthelfer} placeholder="Name" addLabel="Ersthelfer hinzufügen" /></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fachkraft für Arbeitssicherheit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="sifaName" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="sifaMobil" render={({ field }) => (<FormItem><FormLabel>Mobil</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </div>
            <FormField control={form.control} name="sifaAdresse" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="sifaTelefon" render={({ field }) => (<FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <ContactCard title="Durchgangsarzt" nameField="durchgangsarztName" adresseField="durchgangsarztAdresse" telefonField="durchgangsarztTelefon" />
          <ContactCard title="Betriebsarzt" nameField="betriebsarztName" adresseField="betriebsarztAdresse" telefonField="betriebsarztTelefon" />
          <ContactCard title="Berufsgenossenschaft" nameField="bgName" adresseField="bgAdresse" telefonField="bgTelefon" />
          <ContactCard title="Arbeitsschutzbehörde" nameField="behoerdeName" adresseField="behoerdeAdresse" telefonField="behoerdeTelefon" />
        </div>

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
