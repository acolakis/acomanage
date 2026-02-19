"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  FlaskConical,
  AlertTriangle,
  Shield,
  FileDown,
  FileText,
  Sparkles,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdoptBaDialog } from "@/components/substances/adopt-ba-dialog";

interface SubstanceData {
  id: string;
  lfdNr: number | null;
  tradeName: string;
  manufacturer: string | null;
  casNumber: string | null;
  sdsDate: string | null;
  gbaDate: string | null;
  gbaNumber: string | null;
  usageLocation: string | null;
  usageProcess: string | null;
  exposedPersons: number | null;
  skinContact: boolean;
  usageFrequency: string | null;
  labeling: string | null;
  protectiveMeasures: string | null;
  containerSize: string | null;
  storageLocation: string | null;
  storageAmount: string | null;
  ghsPictograms: string[];
  hStatements: string[];
  pStatements: string[];
  signalWord: string | null;
  wgk: string | null;
  gbaDocument: { id: string; title: string; filePath: string | null } | null;
  company: { id: string; name: string };
}

const ghsLabels: Record<string, string> = {
  GHS01: "Explodierende Bombe",
  GHS02: "Flamme",
  GHS03: "Flamme über Kreis",
  GHS04: "Gasflasche",
  GHS05: "Ätzwirkung",
  GHS06: "Totenkopf",
  GHS07: "Ausrufezeichen",
  GHS08: "Gesundheitsgefahr",
  GHS09: "Umwelt",
};

export default function GefahrstoffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [substance, setSubstance] = useState<SubstanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [gbaLoading, setGbaLoading] = useState(false);
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [baDownloading, setBaDownloading] = useState(false);

  const fetchSubstance = useCallback(async () => {
    try {
      const res = await fetch(`/api/substances/${params.id}`);
      if (!res.ok) throw new Error("Nicht gefunden");
      setSubstance(await res.json());
    } catch {
      router.push("/gefahrstoffe");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchSubstance();
  }, [fetchSubstance]);

  const handleSdsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("substanceId", params.id as string);
      const res = await fetch("/api/ai/extract-sds", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler bei der Extraktion");
      }
      alert("SDB wurde erfolgreich analysiert! Daten wurden aktualisiert.");
      fetchSubstance();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler bei der KI-Extraktion");
    } finally {
      setExtracting(false);
    }
  };

  const handleDownloadGba = async () => {
    setGbaLoading(true);
    try {
      const res = await fetch(`/api/substances/${params.id}/gba`);
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GBA_${substance?.tradeName || "Betriebsanweisung"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Fehler beim Generieren der Betriebsanweisung");
    } finally {
      setGbaLoading(false);
    }
  };

  const handleDownloadBa = async () => {
    if (!substance?.gbaDocument || !substance?.company) return;
    setBaDownloading(true);
    try {
      const res = await fetch(
        `/api/companies/${substance.company.id}/templates/${substance.gbaDocument.id}/download`
      );
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? decodeURIComponent(match[1]) : `BA_${substance.tradeName}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Fehler beim Herunterladen der Betriebsanweisung");
    } finally {
      setBaDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Gefahrstoff wirklich archivieren?")) return;
    try {
      await fetch(`/api/substances/${params.id}`, { method: "DELETE" });
      router.push("/gefahrstoffe");
    } catch (error) {
      console.error("Error deleting substance:", error);
    }
  };

  if (loading || !substance) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("de-DE");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gefahrstoffe">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {substance.tradeName}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Nr. {substance.lfdNr}</span>
            <span>{substance.company.name}</span>
            {substance.signalWord && (
              <Badge
                variant={
                  substance.signalWord === "Gefahr"
                    ? "destructive"
                    : "secondary"
                }
              >
                {substance.signalWord}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleSdsUpload}
              disabled={extracting}
            />
            <Button variant="outline" asChild disabled={extracting}>
              <span>
                {extracting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {extracting ? "Analysiere..." : "SDB analysieren"}
              </span>
            </Button>
          </label>
          <Button
            variant="outline"
            onClick={handleDownloadGba}
            disabled={gbaLoading}
          >
            {gbaLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            GBA PDF
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/gefahrstoffe/${substance.id}/bearbeiten`}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      {/* GHS Pictograms */}
      {substance.ghsPictograms.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {substance.ghsPictograms.map((ghs) => (
            <Badge key={ghs} variant="outline" className="text-sm px-3 py-1">
              {ghs} — {ghsLabels[ghs] || ""}
            </Badge>
          ))}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Grunddaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Handelsname</p>
              <p className="text-muted-foreground">{substance.tradeName}</p>
            </div>
            <div>
              <p className="font-medium">Hersteller</p>
              <p className="text-muted-foreground">
                {substance.manufacturer || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">CAS-Nr.</p>
              <p className="text-muted-foreground font-mono">
                {substance.casNumber || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">GBA-Nr.</p>
              <p className="text-muted-foreground">
                {substance.gbaNumber || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">SDB-Datum</p>
              <p className="text-muted-foreground">
                {formatDate(substance.sdsDate)}
              </p>
            </div>
            <div>
              <p className="font-medium">GBA-Datum</p>
              <p className="text-muted-foreground">
                {formatDate(substance.gbaDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* H/P Statements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Gefahren- und Sicherheitshinweise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">H-Sätze (Gefahrenhinweise)</p>
            {substance.hStatements.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {substance.hStatements.map((h) => (
                  <Badge key={h} variant="destructive" className="text-xs">
                    {h}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keine H-Sätze</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">P-Sätze (Sicherheitshinweise)</p>
            {substance.pStatements.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {substance.pStatements.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keine P-Sätze</p>
            )}
          </div>
          {substance.wgk && (
            <div>
              <p className="text-sm font-medium">WGK</p>
              <p className="text-sm text-muted-foreground">{substance.wgk}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage & Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verwendung & Lagerung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Einsatzort</p>
              <p className="text-muted-foreground">
                {substance.usageLocation || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Verwendungszweck</p>
              <p className="text-muted-foreground">
                {substance.usageProcess || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Exponierte Personen</p>
              <p className="text-muted-foreground">
                {substance.exposedPersons ?? "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Verwendungshäufigkeit</p>
              <p className="text-muted-foreground">
                {substance.usageFrequency || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Hautkontakt</p>
              <p className="text-muted-foreground">
                {substance.skinContact ? "Ja" : "Nein"}
              </p>
            </div>
            <div>
              <p className="font-medium">Gebindegröße</p>
              <p className="text-muted-foreground">
                {substance.containerSize || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Lagerort</p>
              <p className="text-muted-foreground">
                {substance.storageLocation || "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Lagermenge</p>
              <p className="text-muted-foreground">
                {substance.storageAmount || "—"}
              </p>
            </div>
          </div>
          {substance.protectiveMeasures && (
            <div className="mt-4">
              <p className="text-sm font-medium">Schutzmaßnahmen</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {substance.protectiveMeasures}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Betriebsanweisung (BA) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Betriebsanweisung (.docx)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {substance.gbaDocument ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{substance.gbaDocument.title}</p>
                <p className="text-xs text-muted-foreground">
                  Wird beim Download mit den Firmendaten personalisiert
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBa}
                  disabled={baDownloading}
                >
                  {baDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdoptOpen(true)}
                >
                  Ändern
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Keine Betriebsanweisung (.docx) zugewiesen.
              </p>
              <Button variant="outline" onClick={() => setAdoptOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                BA übernehmen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AdoptBaDialog
        substanceId={substance.id}
        substanceName={substance.tradeName}
        open={adoptOpen}
        onOpenChange={setAdoptOpen}
        onComplete={() => fetchSubstance()}
      />
    </div>
  );
}
