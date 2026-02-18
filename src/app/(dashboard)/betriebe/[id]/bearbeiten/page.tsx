"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/companies/company-form";

interface CompanyData {
  id: string;
  name: string;
  legalForm: string | null;
  industryId: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  employeeCount: number | null;
  berufsgenossenschaft: string | null;
  bgMemberNumber: string | null;
  notes: string | null;
}

export default function BearbeitenPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nicht gefunden");
        return res.json();
      })
      .then((data) => {
        setCompany(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/betriebe");
      });
  }, [params.id, router]);

  if (loading || !company) {
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
          <Link href={`/betriebe/${company.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {company.name} bearbeiten
        </h1>
        <p className="text-muted-foreground">
          Aktualisieren Sie die Betriebsdaten.
        </p>
      </div>

      <CompanyForm initialData={company} />
    </div>
  );
}
