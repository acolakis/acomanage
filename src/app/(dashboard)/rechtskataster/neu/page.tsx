"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Import, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Company {
  id: string;
  name: string;
}

const categories = [
  { value: "Gesetz", label: "Gesetz" },
  { value: "Verordnung", label: "Verordnung" },
  { value: "DGUV Vorschrift", label: "DGUV Vorschrift" },
  { value: "DGUV Regel", label: "DGUV Regel" },
  { value: "DGUV Information", label: "DGUV Information" },
  { value: "DGUV Grundsatz", label: "DGUV Grundsatz" },
  { value: "Technische Regel", label: "Technische Regel" },
  { value: "Norm", label: "Norm" },
  { value: "Sonstig", label: "Sonstig" },
];

const complianceStatuses = [
  { value: "OFFEN", label: "Offen" },
  { value: "KONFORM", label: "Konform" },
  { value: "TEILWEISE", label: "Teilweise" },
  { value: "NICHT_KONFORM", label: "Nicht konform" },
];

const standardTemplates = [
  {
    title: "Arbeitsschutzgesetz (ArbSchG)",
    category: "Gesetz",
    relevance: "Grundlage des betrieblichen Arbeitsschutzes",
  },
  {
    title: "Arbeitsstättenverordnung (ArbStättV)",
    category: "Verordnung",
    relevance: "Anforderungen an Arbeitsstätten",
  },
  {
    title: "Betriebssicherheitsverordnung (BetrSichV)",
    category: "Verordnung",
    relevance: "Verwendung von Arbeitsmitteln",
  },
  {
    title: "Gefahrstoffverordnung (GefStoffV)",
    category: "Verordnung",
    relevance: "Umgang mit Gefahrstoffen",
  },
  {
    title: "DGUV Vorschrift 1",
    category: "DGUV Vorschrift",
    relevance: "Grundsätze der Prävention",
  },
  {
    title: "DGUV Vorschrift 3",
    category: "DGUV Vorschrift",
    relevance: "Elektrische Anlagen und Betriebsmittel",
  },
  {
    title: "Arbeitssicherheitsgesetz (ASiG)",
    category: "Gesetz",
    relevance: "Betriebsärzte und Fachkräfte für Arbeitssicherheit",
  },
  {
    title: "PSA-Benutzungsverordnung (PSA-BV)",
    category: "Verordnung",
    relevance: "Benutzung persönlicher Schutzausrüstungen",
  },
  {
    title: "Mutterschutzgesetz (MuSchG)",
    category: "Gesetz",
    relevance: "Schutz von Müttern am Arbeitsplatz",
  },
  {
    title: "Jugendarbeitsschutzgesetz (JArbSchG)",
    category: "Gesetz",
    relevance: "Schutz von Jugendlichen am Arbeitsplatz",
  },
  {
    title: "Biostoffverordnung (BioStoffV)",
    category: "Verordnung",
    relevance: "Umgang mit biologischen Arbeitsstoffen",
  },
  {
    title: "Lärm- und Vibrations-Arbeitsschutzverordnung (LärmVibrationsArbSchV)",
    category: "Verordnung",
    relevance: "Schutz vor Lärm und Vibrationen",
  },
  {
    title: "Lastenhandhabungsverordnung (LasthandhabV)",
    category: "Verordnung",
    relevance: "Manuelle Handhabung von Lasten",
  },
  {
    title: "Baustellenverordnung (BaustellV)",
    category: "Verordnung",
    relevance: "Sicherheit und Gesundheitsschutz auf Baustellen",
  },
  {
    title: "DGUV Regel 100-001",
    category: "DGUV Regel",
    relevance: "Grundsätze der Prävention (Durchführungsanweisung)",
  },
];

function NeueAnforderungContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportMode = searchParams.get("mode") === "import";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "import">(
    isImportMode ? "import" : "form"
  );

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [shortTitle, setShortTitle] = useState("");
  const [category, setCategory] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [relevance, setRelevance] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [complianceStatus, setComplianceStatus] = useState("OFFEN");
  const [complianceNotes, setComplianceNotes] = useState("");
  const [lastReviewDate, setLastReviewDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // Import state
  const [importCompanyId, setImportCompanyId] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(
            data
              .filter((c: Company & { isActive?: boolean }) => c.isActive !== false)
              .map((c: Company) => ({ id: c.id, name: c.name }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!companyId || !title || !category) return;
    setLoading(true);

    const payload = {
      companyId,
      title,
      shortTitle: shortTitle || null,
      category,
      section: section || null,
      description: description || null,
      relevance: relevance || null,
      sourceUrl: sourceUrl || null,
      complianceStatus,
      complianceNotes: complianceNotes || null,
      lastReviewDate: lastReviewDate || null,
      nextReviewDate: nextReviewDate || null,
    };

    try {
      const res = await fetch("/api/legal-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const requirement = await res.json();
      router.push(`/rechtskataster/${requirement.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (index: number) => {
    setSelectedTemplates((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const toggleAllTemplates = () => {
    if (selectedTemplates.length === standardTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(standardTemplates.map((_, i) => i));
    }
  };

  const handleImport = async () => {
    if (!importCompanyId || selectedTemplates.length === 0) return;
    setImporting(true);

    const requirements = selectedTemplates.map((i) => ({
      title: standardTemplates[i].title,
      category: standardTemplates[i].category,
      relevance: standardTemplates[i].relevance,
    }));

    try {
      const res = await fetch("/api/legal-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          companyId: importCompanyId,
          requirements,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Importieren");
      }

      const result = await res.json();
      alert(`${result.count} Anforderungen erfolgreich importiert.`);
      router.push("/rechtskataster");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Importieren");
    } finally {
      setImporting(false);
    }
  };

  const isValid = companyId && title && category;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rechtskataster">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Neue Rechtsanforderung
        </h1>
        <p className="text-muted-foreground">
          Anforderung manuell anlegen oder Standardvorlagen importieren
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "form" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("form")}
        >
          Manuell anlegen
        </Button>
        <Button
          variant={activeTab === "import" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("import")}
        >
          <Import className="mr-2 h-4 w-4" />
          Standardvorlagen importieren
        </Button>
      </div>

      {activeTab === "form" ? (
        <>
          {/* Grunddaten */}
          <Card>
            <CardHeader>
              <CardTitle>Grunddaten</CardTitle>
              <CardDescription>
                Betrieb, Titel und Kategorie der Rechtsanforderung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Betrieb <span className="text-destructive">*</span>
                </Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Betrieb auswählen" />
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
                <Label>
                  Titel <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Arbeitsschutzgesetz (ArbSchG)"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kurzbezeichnung</Label>
                  <Input
                    value={shortTitle}
                    onChange={(e) => setShortTitle(e.target.value)}
                    placeholder="z.B. ArbSchG"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Kategorie <span className="text-destructive">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategorie auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Abschnitt / Paragraph</Label>
                <Input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="z.B. § 5 Beurteilung der Arbeitsbedingungen"
                />
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detaillierte Beschreibung der Anforderung..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Relevanz / Bedeutung</Label>
                <Textarea
                  value={relevance}
                  onChange={(e) => setRelevance(e.target.value)}
                  placeholder="Warum ist diese Anforderung relevant?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Quell-URL</Label>
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.gesetze-im-internet.de/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance-Bewertung */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance-Bewertung</CardTitle>
              <CardDescription>
                Aktueller Konformitätsstatus und Prüftermine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Konformitätsstatus</Label>
                <Select
                  value={complianceStatus}
                  onValueChange={setComplianceStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {complianceStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Compliance-Anmerkungen</Label>
                <Textarea
                  value={complianceNotes}
                  onChange={(e) => setComplianceNotes(e.target.value)}
                  placeholder="Anmerkungen zur Konformitätsbewertung..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Letzte Prüfung</Label>
                  <Input
                    type="date"
                    value={lastReviewDate}
                    onChange={(e) => setLastReviewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nächste Prüfung</Label>
                  <Input
                    type="date"
                    value={nextReviewDate}
                    onChange={(e) => setNextReviewDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/rechtskataster">Abbrechen</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !isValid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Anforderung erstellen
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Import Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Standardvorlagen importieren</CardTitle>
              <CardDescription>
                Wählen Sie einen Betrieb und die zu importierenden
                Rechtsvorschriften aus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Betrieb <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={importCompanyId}
                  onValueChange={setImportCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Betrieb auswählen" />
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

              <div className="flex items-center justify-between">
                <Label>
                  Vorlagen auswählen ({selectedTemplates.length}/
                  {standardTemplates.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllTemplates}
                >
                  {selectedTemplates.length === standardTemplates.length ? (
                    "Keine auswählen"
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Alle auswählen
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2 rounded-md border p-4 max-h-[500px] overflow-y-auto">
                {standardTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 py-2 border-b last:border-b-0"
                  >
                    <Checkbox
                      id={`template-${index}`}
                      checked={selectedTemplates.includes(index)}
                      onCheckedChange={() => toggleTemplate(index)}
                    />
                    <label
                      htmlFor={`template-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-sm">
                        {template.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.category} — {template.relevance}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/rechtskataster">Abbrechen</Link>
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importing ||
                !importCompanyId ||
                selectedTemplates.length === 0
              }
            >
              {importing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Import className="mr-2 h-4 w-4" />
              {selectedTemplates.length} Vorlagen importieren
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function NeueAnforderungPage() {
  return (
    <Suspense fallback={<div className="p-6">Laden...</div>}>
      <NeueAnforderungContent />
    </Suspense>
  );
}
