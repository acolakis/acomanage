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
import { type DigitalCategoryCode } from "@/types/digital-documents";

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  sifaName: z.string().min(1, "Name ist erforderlich"),
  sifaTelefon: z.string(),
  sifaMobil: z.string(),
  sifaBuero: z.string().min(1, "Büro ist erforderlich"),
  sifaBueroAdresse: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: string;
  name: string;
}

interface B01AusweisFormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function B01AusweisForm({ initialData }: B01AusweisFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const fd = initialData?.formData || {};

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      sifaName: (fd.sifaName as string) ?? "",
      sifaTelefon: (fd.sifaTelefon as string) ?? "",
      sifaMobil: (fd.sifaMobil as string) ?? "",
      sifaBuero: (fd.sifaBuero as string) ?? "",
      sifaBueroAdresse: (fd.sifaBueroAdresse as string) ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
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
        sifaName: values.sifaName,
        sifaTelefon: values.sifaTelefon,
        sifaMobil: values.sifaMobil,
        sifaBuero: values.sifaBuero,
        sifaBueroAdresse: values.sifaBueroAdresse,
        datum: values.datum,
      };

      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";

      const payload = {
        companyId: values.companyId,
        categoryCode: "B01_AUSWEIS",
        title: `Sicherheitsausweis — ${companyName} — ${values.sifaName}`,
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
            <CardTitle>Sicherheitsausweis — SIFA</CardTitle>
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
            <FormField
              control={form.control}
              name="sifaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name der SIFA <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Vor- und Nachname" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sifaBuero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Büro-Name <span className="text-destructive">*</span></FormLabel>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
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
