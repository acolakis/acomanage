"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface MachineFormProps {
  initialData?: {
    id: string;
    companyId: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    location: string | null;
    yearOfManufacture: number | null;
  };
}

export function MachineForm({ initialData }: MachineFormProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState(initialData?.companyId || "");
  const [name, setName] = useState(initialData?.name || "");
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [serialNumber, setSerialNumber] = useState(initialData?.serialNumber || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [yearOfManufacture, setYearOfManufacture] = useState(
    initialData?.yearOfManufacture?.toString() || ""
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

  const handleSubmit = async () => {
    if (!companyId || !name) return;
    setLoading(true);

    const payload = {
      companyId,
      name,
      manufacturer: manufacturer || null,
      model: model || null,
      serialNumber: serialNumber || null,
      location: location || null,
      yearOfManufacture: yearOfManufacture || null,
    };

    try {
      const url = initialData
        ? `/api/machines/${initialData.id}`
        : "/api/machines";
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

      const machine = await res.json();
      router.push(`/maschinen/${machine.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/maschinen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {initialData ? "Maschine bearbeiten" : "Neue Maschine"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maschinendaten</CardTitle>
          <CardDescription>Stammdaten der Maschine erfassen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initialData && (
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
          )}

          <div className="space-y-2">
            <Label>Bezeichnung <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Kreissäge, CNC-Fräse, Gabelstapler..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hersteller</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Modell / Typ</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Seriennummer</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Baujahr</Label>
              <Input
                type="number"
                value={yearOfManufacture}
                onChange={(e) => setYearOfManufacture(e.target.value)}
                placeholder="z.B. 2020"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Standort / Einsatzort</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Werkstatt, Halle 2..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/maschinen">Abbrechen</Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !companyId || !name}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {initialData ? "Speichern" : "Maschine speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
