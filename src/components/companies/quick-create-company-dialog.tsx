"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Industry {
  id: string;
  name: string;
}

const NONE = "__none__";

/**
 * Creates a company with the essentials (name, city, industry) without leaving the current page,
 * e.g. when a GoodNotes import is for a company that does not exist yet. Further details can be
 * added later under /betriebe.
 */
export function QuickCreateCompanyDialog({
  open,
  onOpenChange,
  initialName,
  hint,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  hint?: string;
  onCreated: (company: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [industryId, setIndustryId] = useState(NONE);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setError(null);
    if (industries.length === 0) {
      fetch("/api/industries")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setIndustries(data))
        .catch(() => {});
    }
  }, [open, initialName, industries.length]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || null,
          industryId: industryId === NONE ? null : industryId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
      onCreated({ id: data.id, name: data.name });
      onOpenChange(false);
      setCity("");
      setIndustryId(NONE);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Betrieb anlegen</DialogTitle>
          <DialogDescription>
            {hint ?? "Weitere Angaben (Adresse, Ansprechpartner …) kannst du später unter Betriebe ergänzen."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="z. B. Hagebaumarkt Overath"
            />
            <p className="text-xs text-muted-foreground">
              Für den Abgleich mit dem Vorbericht sollte der Name zum Dateinamen im Ordner „Berichte“ passen
              (z. B. „Hagebaumarkt Overath“).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Ort</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Branche</Label>
            <Select value={industryId} onValueChange={setIndustryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Keine / später festlegen</SelectItem>
                {industries.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Mit Branche werden die passenden Dokumentvorlagen zugewiesen.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Betrieb anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
