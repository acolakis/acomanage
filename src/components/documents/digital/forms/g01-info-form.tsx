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
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { type DigitalCategoryCode } from "@/types/digital-documents";

const DEFAULT_BLOECKE = [
  { titel: "Verhalten im Brandfall", inhalt: ["Flucht- und Rettungswege sind gekennzeichnet und freizuhalten", "Bei Brandalarm das Gebäude sofort über die Fluchtwege verlassen", "Sammelplatz aufsuchen und auf Vollzähligkeitskontrolle warten"] },
  { titel: "Erste Hilfe", inhalt: ["Ersthelfer sind in jeder Abteilung benannt", "Standorte der Erste-Hilfe-Kästen kennen", "Jeden Unfall im Verbandbuch dokumentieren"] },
  { titel: "Persönliche Schutzausrüstung", inhalt: ["Die bereitgestellte PSA ist zu tragen", "Beschädigte PSA sofort melden und austauschen", "PSA regelmäßig auf Funktionsfähigkeit prüfen"] },
  { titel: "Gefahrstoffe", inhalt: ["Betriebsanweisungen lesen und beachten", "Gefahrstoffe nur an vorgesehenen Plätzen lagern", "Sicherheitsdatenblätter sind am Arbeitsplatz einsehbar"] },
  { titel: "Ordnung und Sauberkeit", inhalt: ["Arbeitsplatz sauber und ordentlich halten", "Verkehrswege freihalten", "Abfälle sachgerecht entsorgen"] },
];

interface ThemenBlock {
  titel: string;
  inhalt: string[];
}

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  sifaBuero: z.string(),
  geschaeftsfuehrer: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
interface Company { id: string; name: string; }

interface G01InfoFormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: { id: string; companyId: string; formData: Record<string, unknown>; };
}

export function G01InfoForm({ initialData }: G01InfoFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const fd = initialData?.formData || {};

  const [bloecke, setBloecke] = useState<ThemenBlock[]>(
    () => (fd.themenBloecke as ThemenBlock[]) || DEFAULT_BLOECKE.map((b) => ({ ...b, inhalt: [...b.inhalt] }))
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      sifaBuero: (fd.sifaBuero as string) ?? "",
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

  const toggleExpand = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
    setExpanded(next);
  };

  const updateBlockTitel = (idx: number, titel: string) => {
    setBloecke(bloecke.map((b, i) => (i === idx ? { ...b, titel } : b)));
  };

  const updateBlockInhalt = (idx: number, inhalt: string[]) => {
    setBloecke(bloecke.map((b, i) => (i === idx ? { ...b, inhalt } : b)));
  };

  const addBlock = () => {
    setBloecke([...bloecke, { titel: "", inhalt: [""] }]);
    setExpanded(new Set(Array.from(expanded).concat(bloecke.length)));
  };

  const removeBlock = (idx: number) => {
    setBloecke(bloecke.filter((_, i) => i !== idx));
  };

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";
      const payload = {
        companyId: values.companyId, categoryCode: "G01_INFO",
        title: `Arbeitsschutzerstinformation — ${companyName}`,
        formData: {
          themenBloecke: bloecke.map((b) => ({ titel: b.titel, inhalt: b.inhalt.filter((i) => i.trim()) })).filter((b) => b.titel.trim()),
          sifaBuero: values.sifaBuero,
          geschaeftsfuehrer: values.geschaeftsfuehrer,
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
          <CardHeader><CardTitle>Arbeitsschutzerstinformation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="companyId" render={({ field }) => (
              <FormItem><FormLabel>Betrieb <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Betrieb" /></SelectTrigger></FormControl>
                  <SelectContent>{companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="sifaBuero" render={({ field }) => (
                <FormItem><FormLabel>SIFA-Büro</FormLabel><FormControl><Input placeholder="z.B. AcoManage GmbH" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="geschaeftsfuehrer" render={({ field }) => (
                <FormItem><FormLabel>Geschäftsführer/in</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Themenblöcke ({bloecke.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bloecke.map((block, idx) => (
              <div key={idx} className="border rounded-md">
                <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(idx)}>
                  {expanded.has(idx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Input
                    value={block.titel}
                    onChange={(e) => { e.stopPropagation(); updateBlockTitel(idx, e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Titel des Themenblocks"
                    className="h-8 font-medium"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {expanded.has(idx) && (
                  <div className="p-3 pt-0 space-y-2">
                    {block.inhalt.map((item, iIdx) => (
                      <div key={iIdx} className="flex gap-2">
                        <span className="text-sm text-muted-foreground mt-1.5">•</span>
                        <Textarea
                          value={item}
                          onChange={(e) => {
                            const updated = [...block.inhalt];
                            updated[iIdx] = e.target.value;
                            updateBlockInhalt(idx, updated);
                          }}
                          rows={1}
                          className="flex-1 min-h-[2rem]"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                          onClick={() => updateBlockInhalt(idx, block.inhalt.filter((_, i) => i !== iIdx))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => updateBlockInhalt(idx, [...block.inhalt, ""])} className="gap-1">
                      <Plus className="h-3 w-3" /> Punkt hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-1">
              <Plus className="h-4 w-4" /> Themenblock hinzufügen
            </Button>
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
