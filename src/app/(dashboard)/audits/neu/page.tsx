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

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

const auditTypes = [
  { value: "SYSTEM", label: "Systemaudit" },
  { value: "PROZESS", label: "Prozessaudit" },
  { value: "COMPLIANCE", label: "Complianceaudit" },
];

export default function NeuesAuditPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [auditType, setAuditType] = useState("");
  const [isoClause, setIsoClause] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [auditorId, setAuditorId] = useState("");
  const [auditees, setAuditees] = useState("");
  const [scope, setScope] = useState("");

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
            data
              .filter((u: User & { isActive?: boolean }) => u.isActive !== false)
              .map((u: User) => ({
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
    if (!companyId || !title || !auditType) return;
    setLoading(true);

    const payload = {
      companyId,
      title,
      auditType,
      isoClause: isoClause || null,
      plannedDate: plannedDate || null,
      auditorId: auditorId || null,
      auditees: auditees || null,
      scope: scope || null,
    };

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Fehler beim Speichern");
      }

      const audit = await res.json();
      router.push(`/audits/${audit.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const isValid = companyId && title && auditType;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neues Audit</h1>
        <p className="text-muted-foreground">
          Internes Audit nach ISO 45001 planen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
          <CardDescription>Betrieb, Typ und Grundinformationen</CardDescription>
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
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titel <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Systemaudit Q1 2026"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Audit-Typ <span className="text-destructive">*</span></Label>
              <Select value={auditType} onValueChange={setAuditType}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {auditTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ISO-Klausel</Label>
              <Input
                value={isoClause}
                onChange={(e) => setIsoClause(e.target.value)}
                placeholder="z.B. 9.2, 6.1, 7.2"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Geplantes Datum</Label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Auditor</Label>
              <Select
                value={auditorId || "__none__"}
                onValueChange={(v) => setAuditorId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auditor auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nicht zugewiesen</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Umfang</CardTitle>
          <CardDescription>Auditierte Bereiche und Geltungsbereich</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Auditierte Bereiche</Label>
            <Textarea
              value={auditees}
              onChange={(e) => setAuditees(e.target.value)}
              placeholder="z.B. Produktion, Lager, Verwaltung..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Geltungsbereich</Label>
            <Textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="z.B. Arbeitsschutzmanagement gemäß ISO 45001..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/audits">Abbrechen</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !isValid}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Audit erstellen
        </Button>
      </div>
    </div>
  );
}
