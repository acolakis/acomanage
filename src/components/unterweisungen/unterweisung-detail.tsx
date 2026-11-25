"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UnterweisungData {
  id: string;
  companyId: string;
  abteilung: string | null;
  ort: string | null;
  datum: string;
  zeitVon: string | null;
  zeitBis: string | null;
  anlass: string[];
  inhalt: string;
  naechsterTermin: string | null;
  teilnehmerAnzahl: number | null;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
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

const statusLabels: Record<string, string> = {
  entwurf: "Entwurf",
  abgeschlossen: "Abgeschlossen",
};

const statusColors: Record<string, string> = {
  entwurf: "bg-yellow-100 text-yellow-800 border-yellow-300",
  abgeschlossen: "bg-green-100 text-green-800 border-green-300",
};

export function UnterweisungDetail({
  unterweisung: initial,
}: {
  unterweisung: UnterweisungData;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [abteilung, setAbteilung] = useState(data.abteilung || "");
  const [ort, setOrt] = useState(data.ort || "");
  const [datum, setDatum] = useState(data.datum.split("T")[0]);
  const [zeitVon, setZeitVon] = useState(data.zeitVon || "");
  const [zeitBis, setZeitBis] = useState(data.zeitBis || "");
  const [anlass, setAnlass] = useState<string[]>(data.anlass);
  const [inhalt, setInhalt] = useState(data.inhalt);
  const [naechsterTermin, setNaechsterTermin] = useState(
    data.naechsterTermin || ""
  );
  const [teilnehmerAnzahl, setTeilnehmerAnzahl] = useState(
    String(data.teilnehmerAnzahl || 10)
  );

  function toggleAnlass(value: string) {
    setAnlass((prev) =>
      prev.includes(value)
        ? prev.filter((a) => a !== value)
        : [...prev, value]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/unterweisungen/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abteilung,
          ort,
          datum,
          zeitVon,
          zeitBis,
          anlass,
          inhalt,
          naechsterTermin,
          teilnehmerAnzahl,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setEditing(false);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/unterweisungen/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData(updated);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/unterweisungen/${data.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/unterweisungsnachweise");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/unterweisungsnachweise">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Unterweisung – {data.company.name}
            </h1>
            <p className="text-muted-foreground">
              {new Date(data.datum).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {data.abteilung ? ` · ${data.abteilung}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={statusColors[data.status] || ""}
          >
            {statusLabels[data.status] || data.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a
            href={`/api/unterweisungen/${data.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF herunterladen
          </a>
        </Button>
        {data.status === "entwurf" && (
          <Button
            variant="outline"
            onClick={() => handleStatusChange("abgeschlossen")}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Abschließen
          </Button>
        )}
        {data.status === "abgeschlossen" && (
          <Button
            variant="outline"
            onClick={() => handleStatusChange("entwurf")}
          >
            Wieder öffnen
          </Button>
        )}
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unterweisung löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Unterweisung wird archiviert.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {editing ? (
        /* Edit mode */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Termin & Ort</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Abteilung</Label>
                  <Input
                    value={abteilung}
                    onChange={(e) => setAbteilung(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ort</Label>
                  <Input
                    value={ort}
                    onChange={(e) => setOrt(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Datum</Label>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anlass der Unterweisung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {ANLASS_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-anlass-${option}`}
                      checked={anlass.includes(option)}
                      onCheckedChange={() => toggleAnlass(option)}
                    />
                    <Label
                      htmlFor={`edit-anlass-${option}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inhalt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={inhalt}
                onChange={(e) => setInhalt(e.target.value)}
                rows={8}
              />
            </CardContent>
          </Card>

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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anzahl Teilnehmerzeilen</Label>
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
          </div>
        </div>
      ) : (
        /* View mode */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Betrieb</dt>
                  <dd className="font-medium">{data.company.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Abteilung</dt>
                  <dd className="font-medium">{data.abteilung || "–"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Datum</dt>
                  <dd className="font-medium">
                    {new Date(data.datum).toLocaleDateString("de-DE")}
                    {data.zeitVon && data.zeitBis
                      ? `, ${data.zeitVon} – ${data.zeitBis}`
                      : data.zeitVon
                        ? `, ${data.zeitVon}`
                        : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Ort</dt>
                  <dd className="font-medium">{data.ort || "–"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Nächster Termin
                  </dt>
                  <dd className="font-medium">
                    {data.naechsterTermin || "–"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Erstellt von</dt>
                  <dd className="font-medium">
                    {data.createdBy
                      ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
                      : "–"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {data.anlass.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Anlass der Unterweisung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.anlass.map((a) => (
                    <Badge key={a} variant="secondary">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Inhalt der Unterweisung / Beratung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{data.inhalt}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
