"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const companyFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(255, "Name ist zu lang"),
  legalForm: z.string(),
  industryId: z.string(),
  street: z.string(),
  zip: z.string(),
  city: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  berufsgenossenschaft: z.string(),
  bgMemberNumber: z.string(),
  notes: z.string(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface Industry {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface CompanyFormProps {
  initialData?: {
    id: string;
    name: string;
    legalForm: string | null;
    industryId: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    employeeCount: number | null;
    berufsgenossenschaft: string | null;
    bgMemberNumber: string | null;
    notes: string | null;
  };
}

const NO_INDUSTRY = "__none__";

export function CompanyForm({ initialData }: CompanyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);

  const isEditMode = !!initialData;

  useEffect(() => {
    async function fetchIndustries() {
      try {
        const res = await fetch("/api/industries");
        if (res.ok) {
          const data = await res.json();
          setIndustries(data);
        }
      } catch (error) {
        console.error("Error fetching industries:", error);
      }
    }
    fetchIndustries();
  }, []);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      legalForm: initialData?.legalForm ?? "",
      industryId: initialData?.industryId ?? "",
      street: initialData?.street ?? "",
      zip: initialData?.zip ?? "",
      city: initialData?.city ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      website: initialData?.website ?? "",
      contactName: initialData?.contactName ?? "",
      contactPhone: initialData?.contactPhone ?? "",
      contactEmail: initialData?.contactEmail ?? "",
      employeeCount: initialData?.employeeCount ?? null,
      berufsgenossenschaft: initialData?.berufsgenossenschaft ?? "",
      bgMemberNumber: initialData?.bgMemberNumber ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  async function onSubmit(values: CompanyFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        industryId: values.industryId || null,
        legalForm: values.legalForm || null,
        street: values.street || null,
        zip: values.zip || null,
        city: values.city || null,
        phone: values.phone || null,
        email: values.email || null,
        website: values.website || null,
        contactName: values.contactName || null,
        contactPhone: values.contactPhone || null,
        contactEmail: values.contactEmail || null,
        employeeCount: values.employeeCount ?? null,
        berufsgenossenschaft: values.berufsgenossenschaft || null,
        bgMemberNumber: values.bgMemberNumber || null,
        notes: values.notes || null,
      };

      const url = isEditMode
        ? `/api/companies/${initialData.id}`
        : "/api/companies";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "Fehler beim Speichern des Betriebs"
        );
      }

      const company = await res.json();

      if (isEditMode) {
        router.push(`/betriebe/${initialData.id}`);
      } else {
        router.push(`/betriebe/${company.id}/vorlagen`);
      }
      router.refresh();
    } catch (error) {
      console.error("Error saving company:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Betriebs"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Stammdaten */}
        <Card>
          <CardHeader>
            <CardTitle>Stammdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Firmenname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalForm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rechtsform</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. GmbH, AG, e.K." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="industryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branche</FormLabel>
                    <Select
                      value={field.value || NO_INDUSTRY}
                      onValueChange={(val) =>
                        field.onChange(val === NO_INDUSTRY ? "" : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Branche auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_INDUSTRY}>
                          Keine Branche
                        </SelectItem>
                        {industries.map((industry) => (
                          <SelectItem key={industry.id} value={industry.id}>
                            {industry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anzahl Mitarbeiter</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="z.B. 50"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? null : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Adresse */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Straße</FormLabel>
                  <FormControl>
                    <Input placeholder="Straße und Hausnummer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PLZ</FormLabel>
                    <FormControl>
                      <Input placeholder="PLZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stadt</FormLabel>
                      <FormControl>
                        <Input placeholder="Stadt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="Telefonnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="firma@beispiel.de"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="www.beispiel.de" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ansprechpartner */}
        <Card>
          <CardHeader>
            <CardTitle>Ansprechpartner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vor- und Nachname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="Telefonnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="kontakt@beispiel.de"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Berufsgenossenschaft */}
        <Card>
          <CardHeader>
            <CardTitle>Berufsgenossenschaft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="berufsgenossenschaft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Berufsgenossenschaft</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. BG BAU, BGN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bgMemberNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mitgliedsnummer</FormLabel>
                    <FormControl>
                      <Input placeholder="BG-Mitgliedsnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sonstiges */}
        <Card>
          <CardHeader>
            <CardTitle>Sonstiges</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zusätzliche Informationen zum Betrieb..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Änderungen speichern" : "Betrieb erstellen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
        </div>
      </form>
    </Form>
  );
}
