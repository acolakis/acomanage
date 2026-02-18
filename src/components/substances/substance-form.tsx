"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

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

const ghsPictogramOptions = [
  { value: "GHS01", label: "GHS01 - Explodierende Bombe" },
  { value: "GHS02", label: "GHS02 - Flamme" },
  { value: "GHS03", label: "GHS03 - Flamme über Kreis" },
  { value: "GHS04", label: "GHS04 - Gasflasche" },
  { value: "GHS05", label: "GHS05 - Ätzwirkung" },
  { value: "GHS06", label: "GHS06 - Totenkopf" },
  { value: "GHS07", label: "GHS07 - Ausrufezeichen" },
  { value: "GHS08", label: "GHS08 - Gesundheitsgefahr" },
  { value: "GHS09", label: "GHS09 - Umwelt" },
];

interface SubstanceFormProps {
  initialData?: {
    id: string;
    companyId: string;
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
  };
}

export function SubstanceForm({ initialData }: SubstanceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [companyId, setCompanyId] = useState(initialData?.companyId || "");
  const [tradeName, setTradeName] = useState(initialData?.tradeName || "");
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer || "");
  const [casNumber, setCasNumber] = useState(initialData?.casNumber || "");
  const [sdsDate, setSdsDate] = useState(
    initialData?.sdsDate ? initialData.sdsDate.split("T")[0] : ""
  );
  const [gbaNumber, setGbaNumber] = useState(initialData?.gbaNumber || "");
  const [usageLocation, setUsageLocation] = useState(initialData?.usageLocation || "");
  const [usageProcess, setUsageProcess] = useState(initialData?.usageProcess || "");
  const [exposedPersons, setExposedPersons] = useState(
    initialData?.exposedPersons?.toString() || ""
  );
  const [skinContact, setSkinContact] = useState(initialData?.skinContact || false);
  const [usageFrequency, setUsageFrequency] = useState(initialData?.usageFrequency || "");
  const [labeling, setLabeling] = useState(initialData?.labeling || "");
  const [protectiveMeasures, setProtectiveMeasures] = useState(
    initialData?.protectiveMeasures || ""
  );
  const [containerSize, setContainerSize] = useState(initialData?.containerSize || "");
  const [storageLocation, setStorageLocation] = useState(initialData?.storageLocation || "");
  const [storageAmount, setStorageAmount] = useState(initialData?.storageAmount || "");
  const [ghsPictograms, setGhsPictograms] = useState<string[]>(
    initialData?.ghsPictograms || []
  );
  const [hStatements, setHStatements] = useState(
    initialData?.hStatements?.join(", ") || ""
  );
  const [pStatements, setPStatements] = useState(
    initialData?.pStatements?.join(", ") || ""
  );
  const [signalWord, setSignalWord] = useState(initialData?.signalWord || "");
  const [wgk, setWgk] = useState(initialData?.wgk || "");

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

  const toggleGhs = (value: string) => {
    setGhsPictograms((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!companyId || !tradeName) return;
    setLoading(true);

    const payload = {
      companyId,
      tradeName,
      manufacturer: manufacturer || null,
      casNumber: casNumber || null,
      sdsDate: sdsDate || null,
      gbaNumber: gbaNumber || null,
      usageLocation: usageLocation || null,
      usageProcess: usageProcess || null,
      exposedPersons: exposedPersons ? parseInt(exposedPersons) : null,
      skinContact,
      usageFrequency: usageFrequency || null,
      labeling: labeling || null,
      protectiveMeasures: protectiveMeasures || null,
      containerSize: containerSize || null,
      storageLocation: storageLocation || null,
      storageAmount: storageAmount || null,
      ghsPictograms,
      hStatements: hStatements
        ? hStatements.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      pStatements: pStatements
        ? pStatements.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      signalWord: signalWord || null,
      wgk: wgk || null,
    };

    try {
      const url = initialData
        ? `/api/substances/${initialData.id}`
        : "/api/substances";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const result = await res.json();
      router.push(`/gefahrstoffe/${result.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
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

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {initialData ? "Gefahrstoff bearbeiten" : "Gefahrstoff erfassen"}
        </h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>
            Handelsname, Hersteller und Betriebszuordnung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initialData && (
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
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Handelsname <span className="text-destructive">*</span>
              </Label>
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="z.B. Aceton"
              />
            </div>
            <div className="space-y-2">
              <Label>Hersteller</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>CAS-Nr.</Label>
              <Input
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
                placeholder="67-64-1"
              />
            </div>
            <div className="space-y-2">
              <Label>SDB-Datum</Label>
              <Input
                type="date"
                value={sdsDate}
                onChange={(e) => setSdsDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>GBA-Nr.</Label>
              <Input
                value={gbaNumber}
                onChange={(e) => setGbaNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GHS Classification */}
      <Card>
        <CardHeader>
          <CardTitle>GHS-Einstufung</CardTitle>
          <CardDescription>
            Piktogramme, Signalwort, H- und P-Sätze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>GHS-Piktogramme</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {ghsPictogramOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                    ghsPictograms.includes(opt.value)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={ghsPictograms.includes(opt.value)}
                    onCheckedChange={() => toggleGhs(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Signalwort</Label>
              <Select value={signalWord || "__none__"} onValueChange={(v) => setSignalWord(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Signalwort wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keins</SelectItem>
                  <SelectItem value="Achtung">Achtung</SelectItem>
                  <SelectItem value="Gefahr">Gefahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WGK</Label>
              <Select value={wgk || "__none__"} onValueChange={(v) => setWgk(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="WGK wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Angabe</SelectItem>
                  <SelectItem value="nwg">nwg</SelectItem>
                  <SelectItem value="1">WGK 1</SelectItem>
                  <SelectItem value="2">WGK 2</SelectItem>
                  <SelectItem value="3">WGK 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>H-Sätze (kommagetrennt)</Label>
            <Input
              value={hStatements}
              onChange={(e) => setHStatements(e.target.value)}
              placeholder="H225, H319, H336"
            />
          </div>

          <div className="space-y-2">
            <Label>P-Sätze (kommagetrennt)</Label>
            <Input
              value={pStatements}
              onChange={(e) => setPStatements(e.target.value)}
              placeholder="P210, P233, P240, P305+P351+P338"
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage & Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Verwendung & Lagerung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Einsatzort</Label>
              <Input
                value={usageLocation}
                onChange={(e) => setUsageLocation(e.target.value)}
                placeholder="z.B. Werkstatt, Labor"
              />
            </div>
            <div className="space-y-2">
              <Label>Verwendungszweck</Label>
              <Input
                value={usageProcess}
                onChange={(e) => setUsageProcess(e.target.value)}
                placeholder="z.B. Reinigung, Entfettung"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Exponierte Personen</Label>
              <Input
                type="number"
                min="0"
                value={exposedPersons}
                onChange={(e) => setExposedPersons(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Verwendungshäufigkeit</Label>
              <Input
                value={usageFrequency}
                onChange={(e) => setUsageFrequency(e.target.value)}
                placeholder="z.B. täglich, wöchentlich"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={skinContact}
                  onCheckedChange={(c) => setSkinContact(c === true)}
                />
                <span className="text-sm">Hautkontakt möglich</span>
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Gebindegröße</Label>
              <Input
                value={containerSize}
                onChange={(e) => setContainerSize(e.target.value)}
                placeholder="z.B. 1L, 25kg"
              />
            </div>
            <div className="space-y-2">
              <Label>Lagerort</Label>
              <Input
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lagermenge</Label>
              <Input
                value={storageAmount}
                onChange={(e) => setStorageAmount(e.target.value)}
                placeholder="z.B. 5L"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kennzeichnung</Label>
            <Textarea
              value={labeling}
              onChange={(e) => setLabeling(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Schutzmaßnahmen</Label>
            <Textarea
              value={protectiveMeasures}
              onChange={(e) => setProtectiveMeasures(e.target.value)}
              placeholder="z.B. Schutzbrille, Handschuhe (Nitril)..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/gefahrstoffe">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !companyId || !tradeName}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {initialData ? "Speichern" : "Gefahrstoff erfassen"}
        </Button>
      </div>
    </div>
  );
}
