"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SubstanceForm } from "@/components/substances/substance-form";

export default function GefahrstoffBearbeitenPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/substances/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((substance) => {
        setData({
          ...substance,
          companyId: substance.company.id,
        });
      })
      .catch(() => router.push("/gefahrstoffe"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SubstanceForm initialData={data} />;
}
