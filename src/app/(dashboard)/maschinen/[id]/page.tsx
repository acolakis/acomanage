"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MachineData {
  id: string;
  name: string;
  machineNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  yearOfManufacture: number | null;
  status: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

export default function MaschineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [machine, setMachine] = useState<MachineData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMachine = useCallback(async () => {
    try {
      const res = await fetch(`/api/machines/${params.id}`);
      if (!res.ok) throw new Error("Nicht gefunden");
      setMachine(await res.json());
    } catch {
      router.push("/maschinen");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchMachine();
  }, [fetchMachine]);

  const handleDelete = async () => {
    if (!confirm("Maschine wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/machines/${params.id}`, { method: "DELETE" });
      if (res.ok) router.push("/maschinen");
    } catch {
      alert("Fehler beim Löschen");
    }
  };

  if (loading || !machine) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/maschinen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cog className="h-6 w-6" />
            {machine.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{machine.company.name}</span>
            {machine.manufacturer && <span>{machine.manufacturer}</span>}
            {machine.model && <Badge variant="outline">{machine.model}</Badge>}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Löschen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maschinendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Bezeichnung</p>
              <p className="text-muted-foreground">{machine.name}</p>
            </div>
            <div>
              <p className="font-medium">Betrieb</p>
              <p className="text-muted-foreground">{machine.company.name}</p>
            </div>
            <div>
              <p className="font-medium">Hersteller</p>
              <p className="text-muted-foreground">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Modell / Typ</p>
              <p className="text-muted-foreground">{machine.model || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Seriennummer</p>
              <p className="text-muted-foreground">{machine.serialNumber || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Baujahr</p>
              <p className="text-muted-foreground">{machine.yearOfManufacture || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Standort</p>
              <p className="text-muted-foreground">{machine.location || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Maschinennummer</p>
              <p className="text-muted-foreground">{machine.machineNumber || "—"}</p>
            </div>
            {machine.createdBy && (
              <div>
                <p className="font-medium">Erfasst von</p>
                <p className="text-muted-foreground">
                  {machine.createdBy.firstName} {machine.createdBy.lastName}
                </p>
              </div>
            )}
            <div>
              <p className="font-medium">Erfasst am</p>
              <p className="text-muted-foreground">
                {new Date(machine.createdAt).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
