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
import { type DigitalCategoryCode } from "@/types/digital-documents";

const A02_DEFAULT_PFLICHTEN = [
  "Einrichtung und Unterhaltung der Arbeitsstätten",
  "Beschaffung und Bereitstellung von Arbeitsmitteln",
  "Sichere Gestaltung von Arbeitsverfahren und Arbeitsabläufen",
  "Einweisung und Unterweisung der Beschäftigten",
  "Überwachung der Einhaltung der Arbeitsschutzvorschriften",
  "Sicherstellung der arbeitsmedizinischen Vorsorge",
  "Beschaffung und Bereitstellung von PSA",
  "Überwachung des Tragens und der Benutzung der PSA",
  "Regelung des Verhaltens bei Gefahr / Notfallplanung",
  "Sicherstellung der Ersten Hilfe",
  "Meldung von Arbeitsunfällen und Berufskrankheiten",
  "Begehung der Arbeitsstätten / regelmäßige Kontrollen",
  "Zusammenarbeit mit Betriebsarzt und SIFA",
  "Gefährdungsbeurteilungen durchführen und dokumentieren",
  "Betriebsanweisungen erstellen und bekanntmachen",
  "Prüfung technischer Arbeitsmittel veranlassen",
  "Koordination bei Zusammenarbeit mit Fremdfirmen",
  "Einhaltung Mutterschutz- und Jugendarbeitsschutzvorschriften",
  "Sicherstellung der Gefahrstofflagerung und -kennzeichnung",
  "Überwachung der Einhaltung von Transportvorschriften",
  "Umsetzung der Brandschutzmaßnahmen",
  "Dokumentation aller Arbeitsschutzmaßnahmen",
  "Mitwirkung bei der Weiterentwicklung des AMS",
];

const formSchema = z.object({
  companyId: z.string().min(1, "Betrieb ist erforderlich"),
  personName: z.string().min(1, "Name ist erforderlich"),
  personPosition: z.string(),
  personAbteilung: z.string(),
  personRolle: z.string().min(1, "Rolle ist erforderlich"),
  firmenNamen: z.string(),
  datum: z.string().min(1, "Datum ist erforderlich"),
  betragslimit: z.string(),
  zusatzRolle: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: string;
  name: string;
}

interface A02FormProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function A02Form({ initialData }: A02FormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const fd = initialData?.formData || {};
  const person = (fd.person as Record<string, string>) || {};

  const [pflichten, setPflichten] = useState<string[]>(
    () => (fd.pflichten as string[]) || [...A02_DEFAULT_PFLICHTEN]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: initialData?.companyId ?? "",
      personName: person.name ?? "",
      personPosition: person.position ?? "",
      personAbteilung: (fd.personAbteilung as string) ?? "",
      personRolle: (fd.personRolle as string) ?? "",
      firmenNamen: (fd.firmenNamen as string) ?? "",
      datum: (fd.datum as string) ?? new Date().toISOString().split("T")[0],
      betragslimit: (fd.betragslimit as string) ?? "",
      zusatzRolle: (fd.zusatzRolle as string) ?? "",
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
        },
        personAbteilung: values.personAbteilung,
        personRolle: values.personRolle,
        firmenNamen: values.firmenNamen || companies.find((c) => c.id === values.companyId)?.name || "",
        datum: values.datum,
        pflichten: pflichten.filter((p) => p.trim()),
        betragslimit: values.betragslimit,
        zusatzRolle: values.zusatzRolle || values.personRolle,
      };

      const companyName = companies.find((c) => c.id === values.companyId)?.name || "";

      const payload = {
        companyId: values.companyId,
        categoryCode: "A02",
        title: `Pflichtenübertragung — ${companyName} — ${values.personName}`,
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
            <CardTitle>Übertragung der Unternehmerpflichten</CardTitle>
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
              name="firmenNamen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmenname(n) im Dokument</FormLabel>
                  <FormControl><Input placeholder="Falls abweichend vom Betrieb (z.B. mehrere Firmen)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beauftragte Person</CardTitle>
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
                name="personAbteilung"
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
                name="personRolle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle / Funktion <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="z.B. Stellv. Leiter der Technik" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="betragslimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budgetlimit (EUR)</FormLabel>
                    <FormControl><Input placeholder="z.B. 5.000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zusatzRolle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle im Zusatz zum Arbeitsvertrag</FormLabel>
                    <FormControl><Input placeholder="Falls abweichend von Rolle oben" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Übertragene Pflichten ({pflichten.length})</CardTitle>
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
