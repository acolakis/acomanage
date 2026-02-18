"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "EMPLOYEE" | "CLIENT";
  phone: string | null;
  companyUsers: { company: { id: string; name: string } }[];
}

export default function BenutzerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nicht gefunden");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/benutzer");
      });
  }, [params.id, router]);

  if (loading || !user) {
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
          <Link href="/benutzer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {user.firstName} {user.lastName} bearbeiten
        </h1>
        <p className="text-muted-foreground">
          Aktualisieren Sie die Benutzerdaten.
        </p>
      </div>

      <UserForm initialData={user} />
    </div>
  );
}
