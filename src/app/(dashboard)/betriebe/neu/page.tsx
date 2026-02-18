"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/companies/company-form";

export default function NeuerBetriebPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/betriebe">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Betrieb</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Betrieb im System.
        </p>
      </div>

      <CompanyForm />
    </div>
  );
}
