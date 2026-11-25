"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { type DigitalCategoryCode } from "@/types/digital-documents";

const FAHRZEUGTYP_OPTIONS = [
  { key: "schubmaststapler", label: "Schubmaststapler" },
  { key: "gabelstapler", label: "Gabelstapler / Frontstapler" },
  { key: "hubarbeitsbuehne", label: "Hubarbeitsbühne" },
  { key: "mitgaenger", label: "Mitgänger-Flurförderzeuge" },
  { key: "innerbetrieblich", label: "Innerbetrieblicher Transport" },
  { key: "beschraenktOeffentlich", label: "Beschränkt öffentlicher Verkehr" },
  { key: "oeffentlich", label: "Öffentlicher Straßenverkehr" },
];

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  personName: z.string().min(1, "Name ist erforderlich"),
  personPosition: z.string(),
  personDepartment: z.string(),
  geburtsdatum: z.string(),
  fuehrerscheinKlasse: z.string().min(1, "Führerscheinklasse ist erforderlich"),
  fuehrerscheinNummer: z.string(),
  fuehrerscheinDatum: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
  produktionsleiter: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: string;
  name: string;
}

interface A03FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function A03Form({ initialData }: A03FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const fd = initialData?.formData || {};
  const person = (fd.person as Record<string, string>) || {};
  const existingFahrzeugtypen = (fd.fahrzeugtypen as Record<string, boolean>) || {};

  const [fahrzeugtypen, setFahrzeugtypen] = useState<Record<string, boolean>>(() => ({
    schubmaststapler: existingFahrzeugtypen.schubmaststapler ?? false,
    gabelstapler: existingFahrzeugtypen.gabelstapler ?? false,
    hubarbeitsbuehne: existingFahrzeugtypen.hubarbeitsbuehne ?? false,
    mitgaenger: existingFahrzeugtypen.mitgaenger ?? false,
    innerbetrieblich: existingFahrzeugtypen.innerbetrieblich ?? false,
    beschraenktOeffentlich: existingFahrzeugtypen.beschraenktOeffentlich ?? false,
    oeffentlich: existingFahrzeugtypen.oeffentlich ?? false,
  }));

  const [kontrollen, setKontrollen] = useState<Array<{ datum: string; bemerkung?: string }>>(
    () => (fd.kontrollen as Array<{ datum: string; bemerkung?: string }>) || []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      personName: person.name ?? "",
      personPosition: person.position ?? "",
      personDepartment: person.department ?? "",
      geburtsdatum: (fd.geburtsdatum as string) ?? "",
      fuehrerscheinKlasse: (fd.fuehrerscheinKlasse as string) ?? "",
      fuehrerscheinNummer: (fd.fuehrerscheinNummer as string) ?? "",
      fuehrerscheinDatum: (fd.fuehrerscheinDatum as string) ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      produktionsleiter: (fd.produktionsleiter as string) ?? "",
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

  const addKontrolle = () => {
    setKontrollen([...kontrollen, { datum: "", bemerkung: "" }]);
  };

  const removeKontrolle = (idx: number) => {
    setKontrollen(kontrollen.filter((_, i) => i !== idx));
  };

  const updateKontrolle = (idx: number, field: string, value: string) => {
    setKontrollen(kontrollen.map((k, i) => (i === idx ? { ...k, [field]: value } : k)));
  };

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const formData = {
        person: {
          name: values.personName,
          position: values.personPosition,
          department: values.personDepartment,
        },
        geburtsdatum: values.geburtsdatum,
        fuehrerscheinKlasse: values.fuehrerscheinKlasse,
        fuehrerscheinNummer: values.fuehrerscheinNummer,
        fuehrerscheinDatum: values.fuehrerscheinDatum,
        fahrzeugtypen,
        datum: values.datum,
        produktionsleiter: values.produktionsleiter,
        kontrollen: kontrollen.filter((k) => k.datum.trim()),
      };

      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";

      const payload = {
        companyId: values.companyId,
        categoryCode: "A03",
        title: `Beauftragung Fahrzeuge — ${companyName} — ${values.personName}`,
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
        <Card>
          <CardHeader>
            <CardTitle>Beauftragung zum Führen von Fahrzeugen</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Personalien</CardTitle>
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
                name="geburtsdatum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geburtsdatum</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="personPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl><Input placeholder="Position" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
            <FormField
              control={form.control}
              name="produktionsleiter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vorgesetzter / Produktionsleiter</FormLabel>
                  <FormControl><Input placeholder="Name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Führerschein</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="fuehrerscheinKlasse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Klasse <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="z.B. B, C, CE" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuehrerscheinNummer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Führerscheinnummer</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuehrerscheinDatum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ausstellungsdatum</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fahrzeugtypen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FAHRZEUGTYP_OPTIONS.map((opt) => (
                <div key={opt.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={fahrzeugtypen[opt.key] || false}
                    onCheckedChange={(checked) =>
                      setFahrzeugtypen({ ...fahrzeugtypen, [opt.key]: !!checked })
                    }
                  />
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Führerscheinkontrollen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kontrollen.map((k, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={k.datum}
                  onChange={(e) => updateKontrolle(idx, "datum", e.target.value)}
                  className="h-8 w-40"
                />
                <Input
                  value={k.bemerkung || ""}
                  onChange={(e) => updateKontrolle(idx, "bemerkung", e.target.value)}
                  placeholder="Bemerkung"
                  className="h-8 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeKontrolle(idx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addKontrolle} className="gap-1">
              <Plus className="h-4 w-4" /> Kontrolle hinzufügen
            </Button>
          </CardContent>
        </Card>

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
