"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const typeOptions = [
  { value: "activity", label: "Tätigkeitsbezogen", description: "Bewertung spezifischer Arbeitstätigkeiten" },
  { value: "workplace", label: "Arbeitsplatzbezogen", description: "Bewertung des Arbeitsplatzes" },
  { value: "substance", label: "Gefahrstoffbezogen", description: "Bewertung des Umgangs mit Gefahrstoffen" },
  { value: "machine", label: "Maschinenbezogen", description: "Bewertung von Maschinen und Arbeitsmitteln" },
  { value: "psyche", label: "Psychische Belastungen", description: "Bewertung psychischer Belastungsfaktoren" },
];

export default function NeueGbuPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [assessedArea, setAssessedArea] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

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

  const handleCreate = async () => {
    if (!companyId || !title || !assessmentType) return;
    setLoading(true);

    try {
      const res = await fetch("/api/risk-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title,
          assessmentType,
          legalBasis: legalBasis || null,
          assessedArea: assessedArea || null,
          assessmentDate: assessmentDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Erstellen");
      }

      const gbu = await res.json();
      router.push(`/gefaehrdungsbeurteilungen/${gbu.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gefaehrdungsbeurteilungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Neue Gefährdungsbeurteilung
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>
            Betrieb, Art und Titel der Beurteilung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Betrieb <span className="text-destructive">*</span></Label>
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
            <Label>Titel <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. GBU Schweißarbeiten, GBU Büroarbeitsplätze..."
            />
          </div>

          <div className="space-y-2">
            <Label>Art der Beurteilung <span className="text-destructive">*</span></Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {typeOptions.map((type) => (
                <div
                  key={type.value}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    assessmentType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => setAssessmentType(type.value)}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Beurteilungsdatum</Label>
              <Input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beurteilter Bereich</Label>
              <Input
                value={assessedArea}
                onChange={(e) => setAssessedArea(e.target.value)}
                placeholder="z.B. Werkstatt, Büro, Lager..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rechtsgrundlage</Label>
            <Textarea
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="z.B. § 5 ArbSchG, DGUV Vorschrift 1..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/gefaehrdungsbeurteilungen">Abbrechen</Link>
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !companyId || !title || !assessmentType}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              GBU erstellen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
