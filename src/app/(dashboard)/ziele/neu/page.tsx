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

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

export default function NeuesZielPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isoClause, setIsoClause] = useState("");
  const [responsibleId, setResponsibleId] = useState("");

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

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(
            data.map((u: UserOption) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!companyId || !title) return;
    setLoading(true);

    const payload = {
      companyId,
      title,
      description: description || null,
      targetValue: targetValue || null,
      currentValue: currentValue || null,
      unit: unit || null,
      startDate: startDate || null,
      targetDate: targetDate || null,
      isoClause: isoClause || null,
      responsibleId: responsibleId || null,
    };

    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const objective = await res.json();
      router.push(`/ziele/${objective.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && title;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ziele">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neues SGA-Ziel</h1>
        <p className="text-muted-foreground">
          SGA-Ziel gemäß ISO 45001 Klausel 6.2 definieren
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>Betrieb und Zielbeschreibung</CardDescription>
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
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titel <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Reduzierung der Arbeitsunfälle um 20%"
            />
          </div>

          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaillierte Beschreibung des Ziels, Hintergrund, Motivation..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>ISO-Klausel</Label>
            <Input
              value={isoClause}
              onChange={(e) => setIsoClause(e.target.value)}
              placeholder="z.B. 6.2.1, 6.2.2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zielvorgaben</CardTitle>
          <CardDescription>Messbare Zielwerte definieren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Zielwert</Label>
              <Input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="z.B. 5, 80, 0"
              />
            </div>
            <div className="space-y-2">
              <Label>Aktueller Wert</Label>
              <Input
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="z.B. 12, 45, 3"
              />
            </div>
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={'z.B. Unfälle/Jahr, %, Tage'}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Zieldatum</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verantwortlichkeit</CardTitle>
          <CardDescription>Zuständige Person für dieses Ziel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Verantwortlich</Label>
            <Select
              value={responsibleId || "__none__"}
              onValueChange={(v) => setResponsibleId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Person auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Keine Angabe</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/ziele">Abbrechen</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Ziel erstellen
        </Button>
      </div>
    </div>
  );
}
