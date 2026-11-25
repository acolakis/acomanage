"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
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

const ANLASS_OPTIONS = [
  "Unfallverhütungsvorschrift",
  "DGUV Vorschrift 1",
  "Arbeitsschutzgesetz",
  "Brandschutz",
  "Arbeitsschutzgesetz § 12",
  "Gefahrstoffverordnung",
  "Betriebssicherheitsverordnung",
  "Erstunterweisung",
];

export default function NeueUnterweisungPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [abteilung, setAbteilung] = useState("");
  const [ort, setOrt] = useState("");
  const [datum, setDatum] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [zeitVon, setZeitVon] = useState("");
  const [zeitBis, setZeitBis] = useState("");
  const [anlass, setAnlass] = useState<string[]>([]);
  const [inhalt, setInhalt] = useState("");
  const [naechsterTermin, setNaechsterTermin] = useState("");
  const [teilnehmerAnzahl, setTeilnehmerAnzahl] = useState("10");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCompanies(list.filter((c: Company & { isActive?: boolean }) => c.isActive !== false));
      })
      .catch(() => {});
  }, []);

  function toggleAnlass(value: string) {
    setAnlass((prev) =>
      prev.includes(value)
        ? prev.filter((a) => a !== value)
        : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !inhalt || !datum) return;

    setLoading(true);
    try {
      const res = await fetch("/api/unterweisungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          abteilung: abteilung || null,
          ort: ort || null,
          datum,
          zeitVon: zeitVon || null,
          zeitBis: zeitBis || null,
          anlass,
          inhalt,
          naechsterTermin: naechsterTermin || null,
          teilnehmerAnzahl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/unterweisungsnachweise/${data.id}`);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const isValid = companyId && inhalt && datum;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/unterweisungsnachweise">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neue Unterweisung
          </h1>
          <p className="text-muted-foreground">
            Unterweisungsnachweis erstellen
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Betrieb & Termin */}
        <Card>
          <CardHeader>
            <CardTitle>Betrieb & Termin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Betrieb *</Label>
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
                <Label>Abteilung</Label>
                <Input
                  value={abteilung}
                  onChange={(e) => setAbteilung(e.target.value)}
                  placeholder="z.B. Werkstatt / Teiledienst"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Uhrzeit von</Label>
                <Input
                  type="time"
                  value={zeitVon}
                  onChange={(e) => setZeitVon(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Uhrzeit bis</Label>
                <Input
                  type="time"
                  value={zeitBis}
                  onChange={(e) => setZeitBis(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                value={ort}
                onChange={(e) => setOrt(e.target.value)}
                placeholder="z.B. Düren"
              />
            </div>
          </CardContent>
        </Card>

        {/* Anlass */}
        <Card>
          <CardHeader>
            <CardTitle>Anlass der Unterweisung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {ANLASS_OPTIONS.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`anlass-${option}`}
                    checked={anlass.includes(option)}
                    onCheckedChange={() => toggleAnlass(option)}
                  />
                  <Label
                    htmlFor={`anlass-${option}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inhalt */}
        <Card>
          <CardHeader>
            <CardTitle>Inhalt der Unterweisung / Beratung *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inhalt}
              onChange={(e) => setInhalt(e.target.value)}
              placeholder="Unterweisungsinhalte beschreiben..."
              rows={8}
            />
          </CardContent>
        </Card>

        {/* Zusätzliches */}
        <Card>
          <CardHeader>
            <CardTitle>Weitere Angaben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nächster Unterweisungstermin</Label>
                <Input
                  value={naechsterTermin}
                  onChange={(e) => setNaechsterTermin(e.target.value)}
                  placeholder="z.B. 02.2027"
                />
              </div>
              <div className="space-y-2">
                <Label>Anzahl Teilnehmerzeilen im PDF</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={teilnehmerAnzahl}
                  onChange={(e) => setTeilnehmerAnzahl(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/unterweisungsnachweise">Abbrechen</Link>
          </Button>
          <Button type="submit" disabled={loading || !isValid}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Erstellen
          </Button>
        </div>
      </form>
    </div>
  );
}
