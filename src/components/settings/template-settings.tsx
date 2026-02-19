"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SETTINGS_KEYS = {
  company: "template_source_company",
  street: "template_source_street",
  zip: "template_source_zip",
  city: "template_source_city",
  geschaeftsfuehrer: "template_source_geschaeftsfuehrer",
  produktionsleiter: "template_source_produktionsleiter",
  technischerLeiter: "template_source_technischer_leiter",
} as const;

const DEFAULTS = {
  company: "Frankenberg",
  street: "Mitterand Straße 35",
  zip: "52146",
  city: "Würselen",
  geschaeftsfuehrer: "Sebastian Schlaadt",
  produktionsleiter: "Stefan Gleixner",
  technischerLeiter: "Frank Becker",
};

export function TemplateSettings() {
  const [values, setValues] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setValues((prev) => ({
          ...prev,
          company: (data[SETTINGS_KEYS.company] as string) || prev.company,
          street: (data[SETTINGS_KEYS.street] as string) || prev.street,
          zip: (data[SETTINGS_KEYS.zip] as string) || prev.zip,
          city: (data[SETTINGS_KEYS.city] as string) || prev.city,
          geschaeftsfuehrer:
            (data[SETTINGS_KEYS.geschaeftsfuehrer] as string) || prev.geschaeftsfuehrer,
          produktionsleiter:
            (data[SETTINGS_KEYS.produktionsleiter] as string) || prev.produktionsleiter,
          technischerLeiter:
            (data[SETTINGS_KEYS.technischerLeiter] as string) || prev.technischerLeiter,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [
        { key: SETTINGS_KEYS.company, value: values.company },
        { key: SETTINGS_KEYS.street, value: values.street },
        { key: SETTINGS_KEYS.zip, value: values.zip },
        { key: SETTINGS_KEYS.city, value: values.city },
        { key: SETTINGS_KEYS.geschaeftsfuehrer, value: values.geschaeftsfuehrer },
        { key: SETTINGS_KEYS.produktionsleiter, value: values.produktionsleiter },
        { key: SETTINGS_KEYS.technischerLeiter, value: values.technischerLeiter },
      ];

      for (const entry of entries) {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error("Fehler");
      }

      alert("Einstellungen gespeichert");
    } catch {
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (field: keyof typeof values, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quell-Firmendaten</CardTitle>
          <CardDescription>
            Diese Firmendaten stehen aktuell in den .docx-Vorlagen und werden
            beim personalisierten Download durch die Betriebsdaten ersetzt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Firmenname</Label>
            <Input
              value={values.company}
              onChange={(e) => updateValue("company", e.target.value)}
              placeholder="z.B. Frankenberg"
            />
          </div>
          <div className="space-y-2">
            <Label>Straße</Label>
            <Input
              value={values.street}
              onChange={(e) => updateValue("street", e.target.value)}
              placeholder="z.B. Mitterand Straße 35"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>PLZ</Label>
              <Input
                value={values.zip}
                onChange={(e) => updateValue("zip", e.target.value)}
                placeholder="z.B. 52146"
              />
            </div>
            <div className="space-y-2">
              <Label>Stadt</Label>
              <Input
                value={values.city}
                onChange={(e) => updateValue("city", e.target.value)}
                placeholder="z.B. Würselen"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quell-Personendaten</CardTitle>
          <CardDescription>
            Diese Personennamen stehen in den Vorlagen und werden durch die
            Ansprechperson des jeweiligen Betriebs ersetzt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Geschäftsführer</Label>
            <Input
              value={values.geschaeftsfuehrer}
              onChange={(e) => updateValue("geschaeftsfuehrer", e.target.value)}
              placeholder="z.B. Sebastian Schlaadt"
            />
          </div>
          <div className="space-y-2">
            <Label>Produktionsleiter</Label>
            <Input
              value={values.produktionsleiter}
              onChange={(e) => updateValue("produktionsleiter", e.target.value)}
              placeholder="z.B. Stefan Gleixner"
            />
          </div>
          <div className="space-y-2">
            <Label>Technischer Leiter</Label>
            <Input
              value={values.technischerLeiter}
              onChange={(e) => updateValue("technischerLeiter", e.target.value)}
              placeholder="z.B. Frank Becker"
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-2">So funktioniert die Ersetzung:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            Beim Download einer .docx-Vorlage werden alle oben genannten Daten
            automatisch durch die Betriebsdaten (Name, Adresse, Ansprechperson) ersetzt.
          </li>
          <li>
            Ihre eigenen Daten als SIFA/Beauftragter bleiben unverändert.
          </li>
          <li>
            Andere Dateiformate (.doc, .pdf, .xlsx) werden ohne Änderung heruntergeladen.
          </li>
          <li>
            Die Original-Vorlagen bleiben immer unverändert.
          </li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Speichern
        </Button>
      </div>
    </div>
  );
}
