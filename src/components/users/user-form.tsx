"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
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

const userCreateSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  role: z.enum(["ADMIN", "EMPLOYEE", "CLIENT"]),
  phone: z.string().optional(),
  companyId: z.string().optional(),
});

const userEditSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen").or(z.literal("")),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  role: z.enum(["ADMIN", "EMPLOYEE", "CLIENT"]),
  phone: z.string().optional(),
  companyId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userCreateSchema>;

interface Company {
  id: string;
  name: string;
}

interface UserFormProps {
  initialData?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "EMPLOYEE" | "CLIENT";
    phone: string | null;
    companyUsers?: { company: { id: string; name: string } }[];
  };
}

const NO_COMPANY = "__none__";

export function UserForm({ initialData }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const isEditMode = !!initialData;

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(data.map((c: Company) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? userEditSchema : userCreateSchema),
    defaultValues: {
      email: initialData?.email ?? "",
      password: "",
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      role: initialData?.role ?? "EMPLOYEE",
      phone: initialData?.phone ?? "",
      companyId: initialData?.companyUsers?.[0]?.company.id ?? "",
    },
  });

  const watchRole = form.watch("role");

  async function onSubmit(values: UserFormValues) {
    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/users/${initialData.id}`
        : "/api/users";
      const method = isEditMode ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
        phone: values.phone || null,
      };

      if (values.password) {
        payload.password = values.password;
      }

      if (values.role === "CLIENT" && values.companyId) {
        payload.companyId = values.companyId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "Fehler beim Speichern des Benutzers"
        );
      }

      router.push("/benutzer");
      router.refresh();
    } catch (error) {
      console.error("Error saving user:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Benutzers"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kontodaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Vorname <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Vorname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nachname <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nachname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      E-Mail <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="benutzer@firma.de"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Passwort{" "}
                    {!isEditMode && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEditMode
                          ? "Leer lassen um Passwort beizubehalten"
                          : "Mindestens 8 Zeichen"
                      }
                      {...field}
                    />
                  </FormControl>
                  {isEditMode && (
                    <FormDescription>
                      Nur ausfüllen, wenn das Passwort geändert werden soll.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rolle & Zuordnung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rolle <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Rolle auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        Administrator - Vollzugriff
                      </SelectItem>
                      <SelectItem value="EMPLOYEE">
                        Mitarbeiter - Eingeschränkter Zugriff
                      </SelectItem>
                      <SelectItem value="CLIENT">
                        Kunde - Nur Portal-Zugriff
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRole === "CLIENT" && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betrieb zuordnen</FormLabel>
                    <Select
                      value={field.value || NO_COMPANY}
                      onValueChange={(val) =>
                        field.onChange(val === NO_COMPANY ? "" : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Betrieb auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_COMPANY}>
                          Kein Betrieb
                        </SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Kunden-Benutzer werden einem Betrieb zugeordnet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Änderungen speichern" : "Benutzer erstellen"}
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
