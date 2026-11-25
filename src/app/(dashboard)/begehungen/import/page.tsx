"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OptionalDateInput } from "@/components/inspections/optional-date-input";
import { QuickCreateCompanyDialog } from "@/components/companies/quick-create-company-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ImportAnalysis,
  ImportFinding,
  ImportItem,
  ImportItemStatus,
  TemplateItemInfo,
} from "@/lib/inspection-import/types";

interface Company {
  id: string;
  name: string;
  isActive?: boolean;
}

const NEW_COMPANY = "__new_company__";

type Phase = "upload" | "transcribing" | "analyzing" | "review" | "creating";
type Filter = "pruefen" | "maengel" | "angaben" | "alle";

const STATUS_OPTIONS: { value: ImportItemStatus; label: string; className: string }[] = [
  { value: "IO", label: "i.O.", className: "bg-green-600 text-white hover:bg-green-600" },
  { value: "MANGEL", label: "Mangel", className: "bg-red-600 text-white hover:bg-red-600" },
  { value: "NICHT_RELEVANT", label: "n.r.", className: "bg-slate-500 text-white hover:bg-slate-500" },
  { value: "UNCHECKED", label: "offen", className: "bg-slate-200 text-slate-800 hover:bg-slate-200" },
];

const RISK_OPTIONS = ["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"] as const;

const ABGLEICH_LABEL: Record<ImportItem["abgleich"], { label: string; className: string }> = {
  BESTAETIGT: { label: "bestätigt", className: "border-green-300 text-green-700" },
  KORRIGIERT: { label: "angepasst", className: "border-amber-400 bg-amber-50 text-amber-800" },
  ABWEICHUNG: { label: "Abweichung", className: "border-orange-400 bg-orange-50 text-orange-800" },
  KEIN_VERGLEICH: { label: "kein Vergleich", className: "border-slate-300 text-slate-500" },
};

const emptyItem = (itemKey: string): ImportItem => ({
  itemKey,
  antwort: "OFFEN",
  status: "UNCHECKED",
  lastTestDate: null,
  nextTestDate: null,
  note: null,
  unsicher: false,
  abgleich: "KEIN_VERGLEICH",
  abgleichHinweis: null,
});

const needsReview = (i: ImportItem) =>
  i.unsicher || i.abgleich === "KORRIGIERT" || i.abgleich === "ABWEICHUNG";

/** "Kaarst 20.07.2026.pdf" → 2026-07-20, "Gerolstein 08.26.pdf" → 2026-08-01 */
function dateFromFileName(name: string): string {
  const full = name.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (full) {
    const y = full[3].length === 2 ? `20${full[3]}` : full[3];
    return `${y}-${full[2].padStart(2, "0")}-${full[1].padStart(2, "0")}`;
  }
  const month = name.match(/(\d{1,2})\.(\d{2,4})/);
  if (month) {
    const y = month[2].length === 2 ? `20${month[2]}` : month[2];
    return `${y}-${month[1].padStart(2, "0")}-01`;
  }
  return "";
}

function companyFromFileName(name: string, companies: Company[]): string {
  const words = name
    .toLowerCase()
    .replace(/\.pdf$/, "")
    .split(/[^a-zäöüß]+/)
    .filter((w) => w.length > 3);
  let best = "";
  let bestScore = 0;
  for (const c of companies) {
    const cname = c.name.toLowerCase();
    const score = words.filter((w) => cname.includes(w)).length;
    if (score > bestScore) {
      best = c.id;
      bestScore = score;
    }
  }
  return best;
}

/** "Overath 15.07.2026.pdf" → "Overath": file name without dates, numbers and extension. */
function companyNameFromFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/\d{1,2}\.\d{1,2}\.\d{2,4}|\d{1,2}[./]\d{2,4}|\d+/g, " ")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatExtraDates(a: ImportAnalysis): string {
  const parts: string[] = [];
  if (a.weiterePruefdaten.length) {
    parts.push(
      "Weitere Prüfdaten:\n" +
        a.weiterePruefdaten
          .map((p) => `- ${p.bezeichnung}: ${p.datum}${p.hinweis ? ` (${p.hinweis})` : ""}`)
          .join("\n")
    );
  }
  if (a.kurznotizen.length) {
    parts.push("Notizen:\n" + a.kurznotizen.map((n) => `- ${n}`).join("\n"));
  }
  return parts.join("\n\n");
}

/** Parses an API response; a non-JSON body (proxy timeout, restart) becomes a readable error. */
async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 504 || res.status === 502 || res.status === 524)
      throw new Error(
        `Der Server hat die Verbindung nach zu langer Wartezeit getrennt (Fehler ${res.status}). Die Abschrift bleibt erhalten – bitte erneut starten.`
      );
    throw new Error(`Unerwartete Antwort vom Server (Fehler ${res.status}). Bitte erneut versuchen.`);
  }
}

/** Description, measure and risk of one finding (Mangel) in the review. */
function FindingEditor({
  finding,
  onChange,
  onRemove,
}: {
  finding: ImportFinding;
  onChange: (patch: Partial<ImportFinding>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Textarea
          rows={2}
          placeholder="Was ist der Mangel?"
          value={finding.beschreibung}
          onChange={(e) => onChange({ beschreibung: e.target.value })}
          className="text-sm"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} aria-label="Befund entfernen">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_130px]">
        <Input
          placeholder="Maßnahme / Empfehlung"
          value={finding.massnahme ?? ""}
          onChange={(e) => onChange({ massnahme: e.target.value || null })}
          className="h-8 text-sm"
        />
        <Select value={finding.risiko} onValueChange={(v) => onChange({ risiko: v as ImportFinding["risiko"] })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RISK_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                Risiko {r.charAt(0) + r.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Starts a background job (transcribe/analyze) and polls until it is done. */
async function runJob(start: Promise<Response>): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await start;
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
  const jobId: string = data.jobId;
  let failures = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    let job;
    try {
      const poll = await fetch(`/api/inspection-import/jobs/${jobId}`, { cache: "no-store" });
      job = await readJson(poll);
      if (!poll.ok) throw new Error(job?.error || `Fehler ${poll.status}`);
      failures = 0;
    } catch (err) {
      // Short network hiccups (tablet standby, Wi-Fi switch) must not cancel a running job
      if (++failures >= 5) throw err;
      continue;
    }
    if (job.status === "done") return job.result;
    if (job.status === "error") throw new Error(job.error);
  }
}

export default function BegehungImportPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyOpen, setNewCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  /** Name guessed from the file name when no company matched */
  const [unknownCompany, setUnknownCompany] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [transcript, setTranscript] = useState("");
  const [transcribedFile, setTranscribedFile] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [templateItems, setTemplateItems] = useState<TemplateItemInfo[]>([]);
  const [items, setItems] = useState<Record<string, ImportItem>>({});
  const [findings, setFindings] = useState<ImportFinding[]>([]);
  const [vorbericht, setVorbericht] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pruefen");
  const [transcribeCost, setTranscribeCost] = useState(0);
  const [analyzeCost, setAnalyzeCost] = useState(0);
  const [parkedFindings, setParkedFindings] = useState<Record<string, ImportFinding[]>>({});

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCompanies(data.filter((c: Company) => c.isActive !== false));
      })
      .catch(() => {});
  }, []);

  const busy = phase === "transcribing" || phase === "analyzing" || phase === "creating";
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy, phase]);

  const selectFile = useCallback(
    (f: File | undefined) => {
      if (!f || f.type !== "application/pdf") return;
      setFile(f);
      setError(null);
      const d = dateFromFileName(f.name);
      if (d) setInspectionDate(d);
      const c = companyFromFileName(f.name, companies);
      if (c) {
        setCompanyId(c);
        setUnknownCompany(null);
      } else {
        // No matching company: offer to create it right away
        const guess = companyNameFromFileName(f.name);
        setCompanyId("");
        setUnknownCompany(guess || null);
        if (guess) {
          setNewCompanyName(guess);
          setNewCompanyOpen(true);
        }
      }
    },
    [companies]
  );

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    setCompanies((prev) => [...prev, company].sort((a, b) => a.name.localeCompare(b.name, "de")));
    setCompanyId(company.id);
    setUnknownCompany(null);
  };

  const runAnalysis = async (text: string) => {
    setPhase("analyzing");
    const data = await runJob(
      fetch("/api/inspection-import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, companyId, inspectionDate }),
      })
    );

    const analysis: ImportAnalysis = data.analysis;
    setAnalyzeCost((prev) => prev + (data.costUsd ?? 0));
    const tItems: TemplateItemInfo[] = data.templateItems;
    const map: Record<string, ImportItem> = {};
    for (const t of tItems) map[t.itemKey] = emptyItem(t.itemKey);
    for (const i of analysis.items) map[i.itemKey] = i;

    setTemplateItems(tItems);
    setItems(map);
    setFindings(analysis.maengel);
    setParkedFindings({});
    setVorbericht(analysis.vorbericht);
    if (analysis.datum && !inspectionDate) setInspectionDate(analysis.datum);
    if (analysis.teilnehmer) setAttendees(analysis.teilnehmer);
    setGeneralNotes(formatExtraDates(analysis));
    setFilter(analysis.items.some(needsReview) ? "pruefen" : "angaben");
    setPhase("review");
  };

  const handleStart = async () => {
    if (!file || !companyId) return;
    setError(null);
    try {
      // If only the analysis failed last time, reuse the transcription of the same file.
      let text = transcribedFile === file.name ? transcript : "";
      if (!text) {
        setPhase("transcribing");
        const fd = new FormData();
        fd.append("pdf", file);
        const data = await runJob(fetch("/api/inspection-import/transcribe", { method: "POST", body: fd }));
        text = data.transcript;
        setTranscribeCost(data.costUsd ?? 0);
        setTranscript(text);
        setTranscribedFile(file.name);
      }
      await runAnalysis(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("upload");
    }
  };

  const handleReanalyze = async () => {
    setError(null);
    try {
      await runAnalysis(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("review");
    }
  };

  const updateItem = (key: string, patch: Partial<ImportItem>) =>
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // A finding belongs to its NEIN item: switching the item to JA/n.r. parks its findings,
  // switching back to NEIN restores them (with the user's edits).
  const setStatus = (key: string, status: ImportItemStatus) => {
    updateItem(key, { status });
    if (status !== "MANGEL") {
      const own = findings.filter((f) => f.itemKey === key);
      if (own.length) {
        setParkedFindings((prev) => ({ ...prev, [key]: own }));
        setFindings((prev) => prev.filter((f) => f.itemKey !== key));
      }
      return;
    }
    if (findings.some((f) => f.itemKey === key)) return;
    const parked = parkedFindings[key];
    if (parked?.length) {
      setFindings((prev) => [...prev, ...parked]);
      return;
    }
    const info = templateItems.find((t) => t.itemKey === key);
    setFindings((prev) => [
      ...prev,
      {
        itemKey: key,
        beschreibung: info ? `${info.label}: Mangel festgestellt` : "Mangel festgestellt",
        massnahme: info?.suggestedMeasure ?? null,
        risiko: info?.defaultRiskLevel ?? "MITTEL",
      },
    ]);
  };

  const updateFinding = (idx: number, patch: Partial<ImportFinding>) =>
    setFindings((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeFinding = (idx: number) => setFindings((prev) => prev.filter((_, i) => i !== idx));
  const addFinding = (itemKey: string | null) => {
    const info = itemKey ? templateItems.find((t) => t.itemKey === itemKey) : null;
    setFindings((prev) => [
      ...prev,
      { itemKey, beschreibung: "", massnahme: info?.suggestedMeasure ?? null, risiko: info?.defaultRiskLevel ?? "MITTEL" },
    ]);
  };

  const handleCreate = async () => {
    if (!companyId || !inspectionDate) return;
    setPhase("creating");
    setError(null);
    try {
      const res = await fetch("/api/inspection-import/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          inspectionDate,
          attendees,
          generalNotes,
          items: Object.values(items),
          findings,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
      router.push(`/begehungen/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("review");
    }
  };

  const all = Object.values(items);
  const stats = {
    io: all.filter((i) => i.status === "IO").length,
    mangel: all.filter((i) => i.status === "MANGEL").length,
    nr: all.filter((i) => i.status === "NICHT_RELEVANT").length,
    angepasst: all.filter((i) => i.abgleich === "KORRIGIERT").length,
    abweichung: all.filter((i) => i.abgleich === "ABWEICHUNG").length,
    unsicher: all.filter((i) => i.unsicher).length,
  };

  const knownKeys = new Set(templateItems.map((t) => t.itemKey));
  const looseFindings = findings
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => !f.itemKey || !knownKeys.has(f.itemKey));

  const visibleSections = useMemo(() => {
    const sections: { title: string; items: TemplateItemInfo[] }[] = [];
    for (const t of templateItems) {
      const item = items[t.itemKey];
      if (!item) continue;
      const hasData =
        item.status !== "UNCHECKED" || item.note || item.lastTestDate || item.nextTestDate || item.antwort !== "OFFEN";
      if (filter === "pruefen" && !needsReview(item)) continue;
      if (filter === "maengel" && item.status !== "MANGEL") continue;
      if (filter === "angaben" && !hasData && !needsReview(item)) continue;
      let section = sections.find((s) => s.title === t.sectionTitle);
      if (!section) {
        section = { title: t.sectionTitle, items: [] };
        sections.push(section);
      }
      section.items.push(t);
    }
    return sections;
  }, [templateItems, items, filter]);

  const progressText =
    phase === "transcribing"
      ? "Schritt 1 von 2: Handschrift wird gelesen (ca. 1–2 Minuten)"
      : phase === "analyzing"
        ? "Schritt 2 von 2: Checkliste wird ausgewertet und mit dem Vorbericht abgeglichen (ca. 2–4 Minuten)"
        : "Begehung wird angelegt …";

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/begehungen">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">GoodNotes-Begehung importieren</h1>
        <p className="text-muted-foreground">
          Die KI liest die Handschrift (Notizen, eingekreistes JA/NEIN, Daten, Namen), ordnet sie der Checkliste A00–XYZ03
          zu und gleicht alles mit dem letzten Bericht ab. Du prüfst das Ergebnis, bevor die Begehung angelegt wird.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(phase === "upload" || busy) && phase !== "creating" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              PDF hochladen
            </CardTitle>
            <CardDescription>
              GoodNotes-Notizbuch als PDF exportieren. Betrieb und Datum werden aus dem Dateinamen übernommen, wenn möglich.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) selectFile(e.dataTransfer.files[0]);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !busy && document.getElementById("pdf-upload")?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                busy ? "opacity-60" : "cursor-pointer hover:bg-accent/50"
              )}
            >
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              {file ? (
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">PDF hierher ziehen oder klicken</p>
              )}
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => selectFile(e.target.files?.[0])}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Betrieb *</Label>
                <Select
                  value={companyId}
                  onValueChange={(v) => {
                    if (v === NEW_COMPANY) {
                      setNewCompanyName(unknownCompany ?? "");
                      setNewCompanyOpen(true);
                      return;
                    }
                    setCompanyId(v);
                    setUnknownCompany(null);
                  }}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Betrieb auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_COMPANY} className="font-medium text-blue-700">
                      + Neuen Betrieb anlegen …
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unknownCompany && !companyId ? (
                  <p className="text-xs text-amber-700">
                    Kein Betrieb zu „{unknownCompany}“ gefunden.{" "}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => {
                        setNewCompanyName(unknownCompany);
                        setNewCompanyOpen(true);
                      }}
                    >
                      Jetzt anlegen
                    </button>{" "}
                    oder oben einen vorhandenen auswählen.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Wird für den Abgleich mit dem Vorbericht benötigt.</p>
                )}
                <QuickCreateCompanyDialog
                  open={newCompanyOpen}
                  onOpenChange={setNewCompanyOpen}
                  initialName={newCompanyName}
                  hint={
                    unknownCompany
                      ? `Zur Datei passt noch kein Betrieb. Lege ihn hier an, weitere Angaben kannst du später unter Betriebe ergänzen.`
                      : undefined
                  }
                  onCreated={handleCompanyCreated}
                />
              </div>
              <div className="space-y-2">
                <Label>Begehungsdatum</Label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">Leer lassen, wenn es auf der Checkliste steht.</p>
              </div>
            </div>

            {busy ? (
              <div className="flex items-center gap-3 rounded-md bg-muted p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="flex-1">{progressText}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                </span>
              </div>
            ) : (
              <Button onClick={handleStart} disabled={!file || !companyId} className="w-full">
                Auswerten
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {(phase === "review" || phase === "creating") && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Kopfdaten</CardTitle>
              <CardDescription>
                {vorbericht ? (
                  <>
                    Abgeglichen mit Vorbericht: <span className="font-medium">{vorbericht}</span>
                  </>
                ) : (
                  "Kein Vorbericht gefunden – Antworten wurden nur aus der Checkliste übernommen."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Betrieb</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Begehungsdatum *</Label>
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teilnehmer</Label>
                <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="border-green-300 text-green-700">{stats.io} i.O.</Badge>
            <Badge variant="outline" className="border-red-300 text-red-700">{stats.mangel} Mängel</Badge>
            <Badge variant="outline">{stats.nr} nicht relevant</Badge>
            <Badge variant="outline" className={ABGLEICH_LABEL.KORRIGIERT.className}>
              {stats.angepasst} durch Abgleich angepasst
            </Badge>
            <Badge variant="outline" className={ABGLEICH_LABEL.ABWEICHUNG.className}>
              {stats.abweichung} Abweichungen zum Vorbericht
            </Badge>
            <Badge variant="outline" className="border-amber-400 text-amber-800">{stats.unsicher} unsicher gelesen</Badge>
            {transcribeCost + analyzeCost > 0 && (
              <span className="text-xs text-muted-foreground sm:ml-auto">
                KI-Kosten: Abschrift{" "}
                {transcribeCost.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ ·
                Auswertung {analyzeCost.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
              </span>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle>Checkliste</CardTitle>
              <div className="flex rounded-md border p-0.5 text-sm">
                {(
                  [
                    ["pruefen", "Zu prüfen"],
                    ["maengel", `Mängel (${stats.mangel})`],
                    ["angaben", "Mit Angaben"],
                    ["alle", "Ganze Checkliste"],
                  ] as [Filter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded px-3 py-1",
                      filter === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {visibleSections.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Punkte in dieser Ansicht.</p>
              )}
              {visibleSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{section.title}</h3>
                  <div className="divide-y rounded-md border">
                    {section.items.map((t) => {
                      const item = items[t.itemKey];
                      const ab = ABGLEICH_LABEL[item.abgleich];
                      return (
                        <div
                          key={t.itemKey}
                          className={cn("space-y-2 p-3", needsReview(item) && "bg-amber-50/40")}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{t.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Checkliste: {item.antwort === "OFFEN" ? "nichts angekreuzt" : item.antwort}
                                {item.unsicher && (
                                  <span className="ml-2 font-medium text-amber-700">· Handschrift unsicher</span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {STATUS_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  onClick={() => setStatus(t.itemKey, o.value)}
                                  className={cn(
                                    "rounded border px-2 py-1 text-xs",
                                    item.status === o.value ? o.className : "bg-background hover:bg-accent"
                                  )}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px]">
                            <label className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground">Name / Bemerkung</span>
                              <Input
                                value={item.note ?? ""}
                                onChange={(e) => updateItem(t.itemKey, { note: e.target.value || null })}
                                className="h-8 text-sm"
                              />
                            </label>
                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground">Datum / letzte Prüfung</span>
                              <OptionalDateInput
                                value={item.lastTestDate ?? ""}
                                onChange={(v) => updateItem(t.itemKey, { lastTestDate: v || null })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground">Nächste Prüfung / gültig bis</span>
                              <OptionalDateInput
                                value={item.nextTestDate ?? ""}
                                onChange={(v) => updateItem(t.itemKey, { nextTestDate: v || null })}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          {item.abgleich !== "KEIN_VERGLEICH" && (
                            <div className="flex items-start gap-2 text-xs">
                              <Badge variant="outline" className={cn("shrink-0", ab.className)}>
                                {ab.label}
                              </Badge>
                              {item.abgleichHinweis && <span className="text-muted-foreground">{item.abgleichHinweis}</span>}
                            </div>
                          )}
                          {item.status === "MANGEL" && (
                            <div className="space-y-2 border-l-2 border-yellow-400 pl-3">
                              {findings.map((f, idx) =>
                                f.itemKey === t.itemKey ? (
                                  <FindingEditor
                                    key={idx}
                                    finding={f}
                                    onChange={(patch) => updateFinding(idx, patch)}
                                    onRemove={() => removeFinding(idx)}
                                  />
                                ) : null
                              )}
                              <button
                                type="button"
                                onClick={() => addFinding(t.itemKey)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <Plus className="h-3 w-3" />
                                {findings.some((f) => f.itemKey === t.itemKey) ? "Weiterer Befund" : "Befund hinzufügen"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Datumsfelder: links Datum des Dokuments bzw. der letzten Prüfung, rechts nächste Prüfung / gültig bis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Weitere Mängel ohne Checklistenpunkt ({looseFindings.length})</CardTitle>
                <CardDescription>
                  Z. B. von der Notizseite. Mängel zu einem Punkt stehen direkt beim Punkt in der Checkliste
                  {stats.mangel > 0 && " (Filter „Mängel“)"}.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => addFinding(null)}>
                <Plus className="mr-1 h-4 w-4" />
                Mangel
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {looseFindings.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine.</p>
              )}
              {looseFindings.map(({ f, idx }) => (
                <div key={idx} className="rounded-md border p-3">
                  <FindingEditor
                    finding={f}
                    onChange={(patch) => updateFinding(idx, patch)}
                    onRemove={() => removeFinding(idx)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weitere Prüfdaten & Notizen</CardTitle>
              <CardDescription>Wird als allgemeine Notiz der Begehung gespeichert.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea rows={8} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                className="flex items-center gap-2 text-left"
              >
                <CardTitle>Abschrift der Handschrift</CardTitle>
                {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <CardDescription>
                So hat die KI das PDF gelesen. Stellen mit [?] waren schwer lesbar. Nach Korrekturen hier kannst du neu
                auswerten lassen.
              </CardDescription>
            </CardHeader>
            {showTranscript && (
              <CardContent className="space-y-3">
                <Textarea
                  rows={20}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={handleReanalyze} disabled={phase !== "review"}>
                  Neu auswerten (überschreibt die Prüfansicht)
                </Button>
              </CardContent>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPhase("upload");
                setTranscript("");
                setTranscribedFile(null);
                setItems({});
                setFindings([]);
              }}
              disabled={phase === "creating"}
            >
              Verwerfen
            </Button>
            <Button onClick={handleCreate} disabled={!companyId || !inspectionDate || phase === "creating"}>
              {phase === "creating" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Begehung anlegen ({stats.io + stats.mangel + stats.nr} Punkte, {findings.length} Mängel)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
