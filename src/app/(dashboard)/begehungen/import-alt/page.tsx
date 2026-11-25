"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  city: string | null;
}

interface ExtractedItem {
  code: string;
  status: string;
  lastTestDate: string | null;
  note: string | null;
}

interface ExtractedMangel {
  beschreibung: string;
  code: string | null;
}

interface ExtractionResult {
  betrieb: string | null;
  datum: string | null;
  teilnehmer: string | null;
  checklistItems: ExtractedItem[];
  maengel: ExtractedMangel[];
}

export default function ImportAltPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [awsTemplateId, setAwsTemplateId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [attendees, setAttendees] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCompanies(data.filter((c) => c.isActive !== false)); })
      .catch(() => {});

    fetch("/api/inspection-templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const aws = data.find((t: { id: string; name: string }) => t.name.includes("AWS") || t.name.includes("A00"));
          if (aws) setAwsTemplateId(aws.id);
        }
      })
      .catch(() => {});
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".doc") || f.name.endsWith(".docx"))) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("doc", file);
      const res = await fetch("/api/ai/extract-inspection-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Fehler bei der Analyse"); return; }
      setResult(data);
      // Pre-fill form
      if (data.datum) setInspectionDate(data.datum.slice(0, 10));
      if (data.teilnehmer) setAttendees(data.teilnehmer);
      // Try to match company name
      if (data.betrieb) {
        const match = companies.find((c) =>
          c.name.toLowerCase().includes(data.betrieb.toLowerCase().split(" ")[0]) ||
          data.betrieb.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
        );
        if (match) setCompanyId(match.id);
      }
    } catch (e) {
      setError("Netzwerkfehler");
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    if (!companyId || !inspectionDate || !result || !awsTemplateId) return;
    setCreating(true);
    try {
      // 1. Create inspection (COMPLETED = historical)
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          templateId: awsTemplateId,
          inspectionType: "REGULAR",
          inspectionDate,
          attendees: attendees || result.teilnehmer || null,
          generalNotes: `Historisch importiert aus: ${file?.name}`,
          status: "COMPLETED",
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      const inspection = await res.json();

      // 2. Load template items to map codes → item IDs
      const templateRes = await fetch(`/api/inspection-templates`);
      const templates = await templateRes.json();
      const template = Array.isArray(templates) ? templates.find((t: { id: string }) => t.id === awsTemplateId) : null;
      if (!template) throw new Error("Vorlage nicht gefunden");
      const itemMap = new Map<string, string>(); // itemKey → id
      for (const section of template.sections || []) {
        for (const item of section.items || []) {
          itemMap.set(item.itemKey, item.id);
        }
      }

      // 3. Save item checks
      const checks = result.checklistItems
        .filter((ci) => itemMap.has(ci.code))
        .map((ci) => ({
          templateItemId: itemMap.get(ci.code)!,
          status: ci.status === "IO" ? "IO" : ci.status === "MANGEL" ? "MANGEL" : "UNCHECKED",
          lastTestDate: ci.lastTestDate || null,
          nextTestDate: null,
          note: ci.note || null,
        }));

      if (checks.length > 0) {
        await fetch(`/api/inspections/${inspection.id}/item-checks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checks }),
        });
      }

      // 4. Save findings (Mängel)
      for (let i = 0; i < result.maengel.length; i++) {
        const m = result.maengel[i];
        await fetch(`/api/inspections/${inspection.id}/findings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: m.beschreibung,
            riskLevel: "MITTEL",
            status: "OPEN",
            findingNumber: i + 1,
          }),
        });
      }

      // 5. Mark as completed
      await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      router.push(`/begehungen/${inspection.id}`);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erstellen der Begehung.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/begehungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alten Bericht importieren</h1>
        <p className="text-muted-foreground">
          Word-Datei (.doc/.docx) hochladen — KI extrahiert die Daten und speichert sie als historische Begehung für den Jahresvergleich.
        </p>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Word-Datei hochladen
          </CardTitle>
          <CardDescription>Begehungsbericht aus den Vorjahren (.doc oder .docx)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("doc-upload")?.click()}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            {file ? (
              <p className="font-medium text-primary">{file.name}</p>
            ) : (
              <>
                <p className="font-medium">Datei hier ablegen oder klicken</p>
                <p className="text-sm text-muted-foreground mt-1">.doc oder .docx</p>
              </>
            )}
          </div>
          <input id="doc-upload" type="file" accept=".doc,.docx" className="hidden" onChange={handleFileChange} />

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button onClick={handleExtract} disabled={!file || extracting} className="w-full">
            {extracting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />KI analysiert Bericht...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" />Bericht analysieren</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Erkannter Betrieb</p>
                <p className="font-semibold mt-1">{result.betrieb || "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Prüfpunkte erkannt</p>
                <p className="font-semibold mt-1 text-2xl">{result.checklistItems.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Mängel erkannt</p>
                <p className="font-semibold mt-1 text-2xl text-orange-600">{result.maengel.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Item preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Erkannte Prüfpunkte (Vorschau)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.checklistItems.slice(0, 20).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant={item.status === "IO" ? "default" : "destructive"} className="w-16 justify-center text-xs">
                      {item.status}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground w-20">{item.code}</span>
                    {item.lastTestDate && <span className="text-xs text-muted-foreground">{item.lastTestDate.slice(0, 7)}</span>}
                    {item.note && <span className="text-xs text-muted-foreground truncate">{item.note}</span>}
                  </div>
                ))}
                {result.checklistItems.length > 20 && (
                  <p className="text-xs text-muted-foreground">+ {result.checklistItems.length - 20} weitere...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Als historische Begehung speichern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Betrieb
                </Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Betrieb auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.city ? ` (${c.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Begehungsdatum
                </Label>
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Teilnehmer</Label>
                <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="z.B. Herr Müller, Frau Schmidt..." />
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!companyId || !inspectionDate || creating}
              >
                {creating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gespeichert...</>
                ) : (
                  "Als historische Begehung speichern"
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
