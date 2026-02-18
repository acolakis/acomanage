"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MachineForm } from "@/components/machines/machine-form";

export default function MaschineBearbeitenPage() {
  const params = useParams();
  const router = useRouter();
  const [initialData, setInitialData] = useState<null | {
    id: string;
    companyId: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    location: string | null;
    yearOfManufacture: number | null;
  }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/machines/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nicht gefunden");
        return res.json();
      })
      .then((data) => {
        setInitialData({
          id: data.id,
          companyId: data.company?.id || data.companyId,
          name: data.name,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber,
          location: data.location,
          yearOfManufacture: data.yearOfManufacture,
        });
      })
      .catch(() => {
        router.push("/maschinen");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id, router]);

  if (loading || !initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <MachineForm initialData={initialData} />;
}
