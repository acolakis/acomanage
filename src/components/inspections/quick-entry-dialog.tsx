"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OptionalDateInput } from "./optional-date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseQuickEntry, type QuickEntryLine } from "@/lib/inspection-quick-entry";

interface Item {
  id: string;
  itemKey: string;
  label: string;
}

interface Row extends QuickEntryLine {
  apply: boolean;
}

const NONE = "__none__";

/**
 * "Schnellerfassung Prüfdaten": type the notes page of the paper checklist,
 * check the assignment, and write dates/remarks into the checklist in one go.
 */
export function QuickEntryDialog({
  open,
  onOpenChange,
  inspectionId,
  inspectionDate,
  generalNotes,
  items,
  statuses,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  inspectionDate: string;
  generalNotes: string | null;
  items: Item[];
  /** templateItemId → current status; only open items are set to JA. */
  statuses: Record<string, string>;
  onDone: (summary: string) => void;
}) {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [setJa, setSetJa] = useState(true);
  const [saving, setSaving] = useState(false);

  const knownKeys = useMemo(() => new Set(items.map((i) => i.itemKey)), [items]);
  const byKey = useMemo(() => new Map(items.map((i) => [i.itemKey, i])), [items]);
  const ref = inspectionDate.slice(0, 10);

  const close = (value: boolean) => {
    if (saving) return;
    onOpenChange(value);
    if (!value) {
      setRows(null);
      setInput("");
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev && prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const apply = async () => {
    if (!rows) return;
    setSaving(true);
    let saved = 0;
    let overdue = 0;
    const unassigned: string[] = [];
    try {
      for (const row of rows) {
        if (!row.apply) continue;
        const item = row.itemKey ? byKey.get(row.itemKey) : undefined;
        if (!item) {
          unassigned.push(row.text);
          continue;
        }
        const res = await fetch(`/api/inspections/${inspectionId}/item-checks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateItemId: item.id,
            ...(setJa && (statuses[item.id] ?? "UNCHECKED") === "UNCHECKED" ? { status: "IO" } : {}),
            note: row.text,
            ...(row.lastTestDate && { lastTestDate: row.lastTestDate }),
            ...(row.nextTestDate && { nextTestDate: row.nextTestDate }),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
        saved++;
        if (data.autoMangel) overdue++;
      }
      if (unassigned.length > 0) {
        const notes = [generalNotes?.trim(), `Notizen Begehung:\n${unassigned.map((t) => `- ${t}`).join("\n")}`]
          .filter(Boolean)
          .join("\n\n");
        const res = await fetch(`/api/inspections/${inspectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generalNotes: notes }),
        });
        if (!res.ok) throw new Error("Anmerkungen konnten nicht gespeichert werden");
      }
      onDone(
        [
          `${saved} Punkte übernommen`,
          overdue > 0 && `${overdue} davon überfällig → Mangel`,
          unassigned.length > 0 && `${unassigned.length} Zeilen in die Anmerkungen`,
        ]
          .filter(Boolean)
          .join(", ")
      );
      setSaving(false);
      close(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schnellerfassung Prüfdaten</DialogTitle>
          <DialogDescription>
            Eine Zeile pro Gerät oder Punkt, z. B. „FL 07/26, 08/27“ oder „Leitern 05/27 Herr Müller“.
            Ein Datum nach dem Begehungsdatum ist der nächste Prüftermin, ein früheres die letzte Prüfung.
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <Textarea
            autoFocus
            rows={12}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"FL 07/26, 08/27\nStapler 10/26\nE-Check 4/25 Mehrfachsteckdose\nVerbandbuch letzter Eintrag 03.05.2026\nKaffeemaschine ohne Prüfsiegel"}
            className="font-mono text-sm"
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => {
              const overdue = !!row.nextTestDate && row.nextTestDate < ref;
              return (
                <div key={index} className={`rounded-md border p-3 ${row.apply ? "" : "opacity-50"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={row.apply}
                      onCheckedChange={(v) => update(index, { apply: v === true })}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={row.text}
                        onChange={(e) => update(index, { text: e.target.value })}
                        className="h-9 font-mono text-sm"
                      />
                      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_10rem] sm:items-end">
                        <div className="space-y-0.5">
                        <span className="text-[11px] text-muted-foreground">Checklistenpunkt</span>
                        <Select
                          value={row.itemKey ?? NONE}
                          onValueChange={(v) => update(index, { itemKey: v === NONE ? null : v })}
                        >
                          <SelectTrigger className={`h-10 ${row.itemKey ? "" : "border-orange-400"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Kein Punkt – in die Anmerkungen</SelectItem>
                            {items.map((i) => (
                              <SelectItem key={i.itemKey} value={i.itemKey}>
                                {i.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] text-muted-foreground">Letzte Prüfung / Datum</span>
                          <OptionalDateInput
                            className="h-10"
                            disabled={!row.itemKey}
                            value={row.lastTestDate ?? ""}
                            onChange={(v) => update(index, { lastTestDate: v || null })}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] text-muted-foreground">Nächste Prüfung</span>
                          <OptionalDateInput
                            className="h-10"
                            invalid={overdue}
                            disabled={!row.itemKey}
                            value={row.nextTestDate ?? ""}
                            onChange={(v) => update(index, { nextTestDate: v || null, nextComputed: false })}
                          />
                        </div>
                      </div>
                      {row.itemKey && (overdue || row.nextComputed) && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                          {row.nextComputed && "Nächste Prüfung aus dem üblichen Prüfintervall berechnet. "}
                          {overdue && <span className="font-medium text-red-600">Überfällig, wird zum Mangel.</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={setJa} onCheckedChange={(v) => setSetJa(v === true)} />
              Offene Punkte auf JA setzen (überfällige werden automatisch NEIN mit Befund)
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!rows ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Abbrechen
              </Button>
              <Button
                disabled={!input.trim()}
                onClick={() =>
                  setRows(parseQuickEntry(input, knownKeys, inspectionDate).map((l) => ({ ...l, apply: true })))
                }
              >
                Weiter zur Prüfung
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRows(null)} disabled={saving}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button onClick={apply} disabled={saving || !rows.some((r) => r.apply)}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {rows.filter((r) => r.apply).length} Zeilen übernehmen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
