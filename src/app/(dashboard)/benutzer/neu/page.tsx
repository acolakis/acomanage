"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";

export default function NeuerBenutzerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/benutzer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Benutzer</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Benutzer im System.
        </p>
      </div>

      <UserForm />
    </div>
  );
}
