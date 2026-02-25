"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Download,
  FileText,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Types
interface InterestedParty {
  party: string;
  needs: string;
  expectations: string;
}

interface OhsRole {
  role: string;
  person: string;
  responsibilities: string;
  appointedDate: string;
}

interface CompanyContextData {
  id?: string;
  companyId: string;
  internalIssues: string | null;
  externalIssues: string | null;
  interestedParties: InterestedParty[] | null;
  sgaScope: string | null;
  scopeInclusions: string | null;
  scopeExclusions: string | null;
  ohsPolicy: string | null;
  ohsPolicyDate: string | null;
  ohsPolicyApprovedBy: string | null;
  ohsRoles: OhsRole[] | null;
  participationMechanism: string | null;
  version: number;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
}

interface CompanyContextWizardProps {
  company: { id: string; name: string; city: string | null };
  context: CompanyContextData | null;
}

const TABS = [
  { key: "kontext", label: "Kontext (4.1)" },
  { key: "parteien", label: "Interessierte Parteien (4.2)" },
  { key: "geltungsbereich", label: "Geltungsbereich (4.3)" },
  { key: "politik", label: "SGA-Politik (5.2)" },
  { key: "rollen", label: "Rollen (5.3)" },
  { key: "beteiligung", label: "Beteiligung (5.4)" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DEFAULT_PARTIES: InterestedParty[] = [
  {
    party: "Beschäftigte",
    needs: "Sichere Arbeitsplätze",
    expectations: "Einhaltung Arbeitsschutzvorschriften",
  },
  {
    party: "Geschäftsführung",
    needs: "Wirtschaftlicher Betrieb",
    expectations: "Rechtssicherheit",
  },
  {
    party: "Berufsgenossenschaft",
    needs: "Beitragsleistung",
    expectations: "Unfallvermeidung",
  },
  {
    party: "Gewerbeaufsicht",
    needs: "Einhaltung Gesetze",
    expectations: "Kooperation",
  },
  {
    party: "Kunden",
    needs: "Zuverlässige Lieferung",
    expectations: "Zertifizierung",
  },
  {
    party: "Lieferanten",
    needs: "Klare Anforderungen",
    expectations: "Partnerschaftliche Zusammenarbeit",
  },
];

const DEFAULT_ROLES: OhsRole[] = [
  {
    role: "Arbeitgeber",
    person: "[Name GF]",
    responsibilities: "Gesamtverantwortung Arbeitsschutz",
    appointedDate: "",
  },
  {
    role: "Fachkraft für Arbeitssicherheit",
    person: "[Name FaSi]",
    responsibilities: "Beratung und Unterstützung gem. ASiG",
    appointedDate: "",
  },
  {
    role: "Betriebsarzt",
    person: "[Name BA]",
    responsibilities: "Arbeitsmedizinische Vorsorge",
    appointedDate: "",
  },
  {
    role: "Sicherheitsbeauftragter",
    person: "[Name SiBe]",
    responsibilities: "Unterstützung Arbeitsschutz gem. § 22 SGB VII",
    appointedDate: "",
  },
  {
    role: "Ersthelfer",
    person: "[Name]",
    responsibilities: "Erste-Hilfe-Leistung",
    appointedDate: "",
  },
  {
    role: "Brandschutzhelfer",
    person: "[Name]",
    responsibilities: "Brandschutz und Evakuierung",
    appointedDate: "",
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function generatePolicyTemplate(companyName: string): string {
  return `SGA-Politik der ${companyName}

Die Geschäftsführung der ${companyName} verpflichtet sich zur:

1. Bereitstellung sicherer und gesundheitsgerechter Arbeitsbedingungen zur Verhütung von arbeitsbedingten Verletzungen und Erkrankungen
2. Einhaltung geltender rechtlicher Verpflichtungen und anderer Anforderungen
3. Beseitigung von Gefährdungen und Verringerung von SGA-Risiken
4. Fortlaufenden Verbesserung des SGA-Managementsystems
5. Konsultation und Beteiligung der Beschäftigten und ihrer Vertreter

Diese Politik wird allen Beschäftigten mitgeteilt und interessierten Parteien auf Anfrage zur Verfügung gestellt.

[Ort], den [Datum]
[Unterschrift Geschäftsführung]`;
}

export function CompanyContextWizard({
  company,
  context,
}: CompanyContextWizardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("kontext");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form state
  const [internalIssues, setInternalIssues] = useState(
    context?.internalIssues ?? ""
  );
  const [externalIssues, setExternalIssues] = useState(
    context?.externalIssues ?? ""
  );
  const [interestedParties, setInterestedParties] = useState<
    InterestedParty[]
  >(
    (context?.interestedParties as InterestedParty[] | null) ?? []
  );
  const [sgaScope, setSgaScope] = useState(context?.sgaScope ?? "");
  const [scopeInclusions, setScopeInclusions] = useState(
    context?.scopeInclusions ?? ""
  );
  const [scopeExclusions, setScopeExclusions] = useState(
    context?.scopeExclusions ?? ""
  );
  const [ohsPolicy, setOhsPolicy] = useState(context?.ohsPolicy ?? "");
  const [ohsPolicyDate, setOhsPolicyDate] = useState(
    toInputDate(context?.ohsPolicyDate ?? null)
  );
  const [ohsPolicyApprovedBy, setOhsPolicyApprovedBy] = useState(
    context?.ohsPolicyApprovedBy ?? ""
  );
  const [ohsRoles, setOhsRoles] = useState<OhsRole[]>(
    (context?.ohsRoles as OhsRole[] | null) ?? []
  );
  const [participationMechanism, setParticipationMechanism] = useState(
    context?.participationMechanism ?? ""
  );
  const [lastReviewDate, setLastReviewDate] = useState(
    toInputDate(context?.lastReviewDate ?? null)
  );
  const [nextReviewDate, setNextReviewDate] = useState(
    toInputDate(context?.nextReviewDate ?? null)
  );

  const version = context?.version ?? 1;

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        internalIssues: internalIssues || null,
        externalIssues: externalIssues || null,
        interestedParties:
          interestedParties.length > 0 ? interestedParties : null,
        sgaScope: sgaScope || null,
        scopeInclusions: scopeInclusions || null,
        scopeExclusions: scopeExclusions || null,
        ohsPolicy: ohsPolicy || null,
        ohsPolicyDate: ohsPolicyDate || null,
        ohsPolicyApprovedBy: ohsPolicyApprovedBy || null,
        ohsRoles: ohsRoles.length > 0 ? ohsRoles : null,
        participationMechanism: participationMechanism || null,
        lastReviewDate: lastReviewDate || null,
        nextReviewDate: nextReviewDate || null,
      };

      const res = await fetch(`/api/companies/${company.id}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "Fehler beim Speichern"
        );
      }

      setLastSaved(new Date());
      router.refresh();
    } catch (error) {
      console.error("Error saving context:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Kontexts"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    company.id,
    internalIssues,
    externalIssues,
    interestedParties,
    sgaScope,
    scopeInclusions,
    scopeExclusions,
    ohsPolicy,
    ohsPolicyDate,
    ohsPolicyApprovedBy,
    ohsRoles,
    participationMechanism,
    lastReviewDate,
    nextReviewDate,
    router,
  ]);

  const handleTabChange = async (newTab: TabKey) => {
    // Auto-save when switching tabs
    await save();
    setActiveTab(newTab);
  };

  // Interested Parties helpers
  const addParty = () => {
    setInterestedParties([
      ...interestedParties,
      { party: "", needs: "", expectations: "" },
    ]);
  };

  const removeParty = (index: number) => {
    setInterestedParties(interestedParties.filter((_, i) => i !== index));
  };

  const updateParty = (
    index: number,
    field: keyof InterestedParty,
    value: string
  ) => {
    const updated = [...interestedParties];
    updated[index] = { ...updated[index], [field]: value };
    setInterestedParties(updated);
  };

  const loadDefaultParties = () => {
    setInterestedParties([...DEFAULT_PARTIES]);
  };

  // OHS Roles helpers
  const addRole = () => {
    setOhsRoles([
      ...ohsRoles,
      { role: "", person: "", responsibilities: "", appointedDate: "" },
    ]);
  };

  const removeRole = (index: number) => {
    setOhsRoles(ohsRoles.filter((_, i) => i !== index));
  };

  const updateRole = (
    index: number,
    field: keyof OhsRole,
    value: string
  ) => {
    const updated = [...ohsRoles];
    updated[index] = { ...updated[index], [field]: value };
    setOhsRoles(updated);
  };

  const loadDefaultRoles = () => {
    setOhsRoles([...DEFAULT_ROLES]);
  };

  const loadPolicyTemplate = () => {
    setOhsPolicy(generatePolicyTemplate(company.name));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/betriebe/${company.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              ISO 45001 Kontext
            </h1>
            <Badge variant="secondary">Version {version}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {company.name}
            {company.city ? ` — ${company.city}` : ""}
          </p>
          {context?.lastReviewDate && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              Letzte Überprüfung: {formatDate(context.lastReviewDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Gespeichert um{" "}
              {lastSaved.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      {/* Review dates */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lastReviewDate">Letzte Überprüfung</Label>
              <Input
                id="lastReviewDate"
                type="date"
                value={lastReviewDate}
                onChange={(e) => setLastReviewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nextReviewDate">
                Nächste Überprüfung geplant
              </Label>
              <Input
                id="nextReviewDate"
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "kontext" && (
        <KontextTab
          internalIssues={internalIssues}
          setInternalIssues={setInternalIssues}
          externalIssues={externalIssues}
          setExternalIssues={setExternalIssues}
        />
      )}

      {activeTab === "parteien" && (
        <ParteienTab
          parties={interestedParties}
          onAdd={addParty}
          onRemove={removeParty}
          onUpdate={updateParty}
          onLoadDefaults={loadDefaultParties}
        />
      )}

      {activeTab === "geltungsbereich" && (
        <GeltungsbereichTab
          sgaScope={sgaScope}
          setSgaScope={setSgaScope}
          scopeInclusions={scopeInclusions}
          setScopeInclusions={setScopeInclusions}
          scopeExclusions={scopeExclusions}
          setScopeExclusions={setScopeExclusions}
        />
      )}

      {activeTab === "politik" && (
        <PolitikTab
          companyId={company.id}
          ohsPolicy={ohsPolicy}
          setOhsPolicy={setOhsPolicy}
          ohsPolicyDate={ohsPolicyDate}
          setOhsPolicyDate={setOhsPolicyDate}
          ohsPolicyApprovedBy={ohsPolicyApprovedBy}
          setOhsPolicyApprovedBy={setOhsPolicyApprovedBy}
          onLoadTemplate={loadPolicyTemplate}
          hasContext={!!context?.id}
        />
      )}

      {activeTab === "rollen" && (
        <RollenTab
          roles={ohsRoles}
          onAdd={addRole}
          onRemove={removeRole}
          onUpdate={updateRole}
          onLoadDefaults={loadDefaultRoles}
        />
      )}

      {activeTab === "beteiligung" && (
        <BeteiligungTab
          participationMechanism={participationMechanism}
          setParticipationMechanism={setParticipationMechanism}
        />
      )}

      {/* Bottom save button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {lastSaved && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Gespeichert um{" "}
            {lastSaved.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Kontext (4.1)
// ============================================================================
function KontextTab({
  internalIssues,
  setInternalIssues,
  externalIssues,
  setExternalIssues,
}: {
  internalIssues: string;
  setInternalIssues: (v: string) => void;
  externalIssues: string;
  setExternalIssues: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontext der Organisation (Klausel 4.1)</CardTitle>
        <CardDescription>
          Bestimmen Sie die internen und externen Themen, die für den Zweck der
          Organisation relevant sind und die ihre Fähigkeit beeinflussen, die
          beabsichtigten Ergebnisse ihres SGA-Managementsystems zu erreichen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="internalIssues">Interne Themen</Label>
          <Textarea
            id="internalIssues"
            value={internalIssues}
            onChange={(e) => setInternalIssues(e.target.value)}
            placeholder="z.B. Organisationsstruktur, Unternehmenskultur, Technologie, finanzielle Situation, Kompetenz der Beschäftigten, bestehende Managementsysteme..."
            className="mt-1 min-h-[150px]"
          />
        </div>

        <Separator />

        <div>
          <Label htmlFor="externalIssues">Externe Themen</Label>
          <Textarea
            id="externalIssues"
            value={externalIssues}
            onChange={(e) => setExternalIssues(e.target.value)}
            placeholder="z.B. Gesetzliche Anforderungen, Wettbewerb, wirtschaftliche Rahmenbedingungen, Lieferkette, technologische Entwicklungen, gesellschaftliche Erwartungen..."
            className="mt-1 min-h-[150px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Interessierte Parteien (4.2)
// ============================================================================
function ParteienTab({
  parties,
  onAdd,
  onRemove,
  onUpdate,
  onLoadDefaults,
}: {
  parties: InterestedParty[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof InterestedParty, value: string) => void;
  onLoadDefaults: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              Interessierte Parteien (Klausel 4.2)
            </CardTitle>
            <CardDescription>
              Bestimmen Sie die interessierten Parteien, die für das
              SGA-Managementsystem relevant sind, sowie deren Bedürfnisse und
              Erwartungen.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onLoadDefaults}>
            <FileText className="mr-2 h-4 w-4" />
            Vorlagen laden
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {parties.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Noch keine interessierten Parteien definiert.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
              <Button variant="outline" size="sm" onClick={onLoadDefaults}>
                <FileText className="mr-2 h-4 w-4" />
                Vorlagen laden
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_40px] gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Partei</span>
              <span>Bedürfnisse</span>
              <span>Erwartungen</span>
              <span />
            </div>

            {parties.map((party, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_40px] items-start rounded-lg border p-3"
              >
                <div>
                  <Label className="sm:hidden text-xs">Partei</Label>
                  <Input
                    value={party.party}
                    onChange={(e) => onUpdate(index, "party", e.target.value)}
                    placeholder="Interessierte Partei"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Bedürfnisse</Label>
                  <Input
                    value={party.needs}
                    onChange={(e) => onUpdate(index, "needs", e.target.value)}
                    placeholder="Bedürfnisse"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Erwartungen</Label>
                  <Input
                    value={party.expectations}
                    onChange={(e) =>
                      onUpdate(index, "expectations", e.target.value)
                    }
                    placeholder="Erwartungen"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Zeile hinzufügen
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Geltungsbereich (4.3)
// ============================================================================
function GeltungsbereichTab({
  sgaScope,
  setSgaScope,
  scopeInclusions,
  setScopeInclusions,
  scopeExclusions,
  setScopeExclusions,
}: {
  sgaScope: string;
  setSgaScope: (v: string) => void;
  scopeInclusions: string;
  setScopeInclusions: (v: string) => void;
  scopeExclusions: string;
  setScopeExclusions: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geltungsbereich des SGA-Managementsystems (Klausel 4.3)</CardTitle>
        <CardDescription>
          Bestimmen Sie die Grenzen und die Anwendbarkeit des
          SGA-Managementsystems, um seinen Geltungsbereich festzulegen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="sgaScope">Geltungsbereich</Label>
          <Textarea
            id="sgaScope"
            value={sgaScope}
            onChange={(e) => setSgaScope(e.target.value)}
            placeholder="z.B. Alle Standorte und Tätigkeiten der [Firma] im Bereich [Beschreibung]..."
            className="mt-1 min-h-[120px]"
          />
        </div>

        <Separator />

        <div>
          <Label htmlFor="scopeInclusions">Einschlüsse</Label>
          <Textarea
            id="scopeInclusions"
            value={scopeInclusions}
            onChange={(e) => setScopeInclusions(e.target.value)}
            placeholder="z.B. Alle Standorte, alle Beschäftigten inkl. Leiharbeitnehmer, alle Tätigkeiten am Standort..."
            className="mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="scopeExclusions">Ausschlüsse</Label>
          <Textarea
            id="scopeExclusions"
            value={scopeExclusions}
            onChange={(e) => setScopeExclusions(e.target.value)}
            placeholder="z.B. Externe Baustellen (separat betrachtet), Homeoffice-Arbeitsplätze..."
            className="mt-1 min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: SGA-Politik (5.2)
// ============================================================================
function PolitikTab({
  companyId,
  ohsPolicy,
  setOhsPolicy,
  ohsPolicyDate,
  setOhsPolicyDate,
  ohsPolicyApprovedBy,
  setOhsPolicyApprovedBy,
  onLoadTemplate,
  hasContext,
}: {
  companyId: string;
  ohsPolicy: string;
  setOhsPolicy: (v: string) => void;
  ohsPolicyDate: string;
  setOhsPolicyDate: (v: string) => void;
  ohsPolicyApprovedBy: string;
  setOhsPolicyApprovedBy: (v: string) => void;
  onLoadTemplate: () => void;
  hasContext: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>SGA-Politik (Klausel 5.2)</CardTitle>
            <CardDescription>
              Die oberste Leitung muss eine SGA-Politik festlegen, umsetzen und
              aufrechterhalten, die einen Rahmen für die Festlegung der
              SGA-Ziele bildet.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onLoadTemplate}>
              <FileText className="mr-2 h-4 w-4" />
              Mustervorlage laden
            </Button>
            {hasContext && ohsPolicy && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`/api/companies/${companyId}/context/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="ohsPolicy">SGA-Politik Text</Label>
          <Textarea
            id="ohsPolicy"
            value={ohsPolicy}
            onChange={(e) => setOhsPolicy(e.target.value)}
            placeholder="Geben Sie hier den vollständigen Text der SGA-Politik ein oder laden Sie die Mustervorlage..."
            className="mt-1 min-h-[300px] font-mono text-sm"
          />
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ohsPolicyApprovedBy">Genehmigt von</Label>
            <Input
              id="ohsPolicyApprovedBy"
              value={ohsPolicyApprovedBy}
              onChange={(e) => setOhsPolicyApprovedBy(e.target.value)}
              placeholder="Name der genehmigenden Person"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ohsPolicyDate">Datum der Genehmigung</Label>
            <Input
              id="ohsPolicyDate"
              type="date"
              value={ohsPolicyDate}
              onChange={(e) => setOhsPolicyDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Rollen (5.3)
// ============================================================================
function RollenTab({
  roles,
  onAdd,
  onRemove,
  onUpdate,
  onLoadDefaults,
}: {
  roles: OhsRole[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof OhsRole, value: string) => void;
  onLoadDefaults: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              Rollen, Verantwortlichkeiten und Befugnisse (Klausel 5.3)
            </CardTitle>
            <CardDescription>
              Die oberste Leitung muss sicherstellen, dass die
              Verantwortlichkeiten und Befugnisse für relevante Rollen innerhalb
              des SGA-Managementsystems zugewiesen und kommuniziert werden.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onLoadDefaults}>
            <FileText className="mr-2 h-4 w-4" />
            Vorlagen laden
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Noch keine Rollen definiert.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
              <Button variant="outline" size="sm" onClick={onLoadDefaults}>
                <FileText className="mr-2 h-4 w-4" />
                Vorlagen laden
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_120px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Rolle</span>
              <span>Person</span>
              <span>Verantwortlichkeiten</span>
              <span>Bestellt am</span>
              <span />
            </div>

            {roles.map((role, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_120px_40px] items-start rounded-lg border p-3"
              >
                <div>
                  <Label className="sm:hidden text-xs">Rolle</Label>
                  <Input
                    value={role.role}
                    onChange={(e) => onUpdate(index, "role", e.target.value)}
                    placeholder="Rolle"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Person</Label>
                  <Input
                    value={role.person}
                    onChange={(e) => onUpdate(index, "person", e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">
                    Verantwortlichkeiten
                  </Label>
                  <Input
                    value={role.responsibilities}
                    onChange={(e) =>
                      onUpdate(index, "responsibilities", e.target.value)
                    }
                    placeholder="Verantwortlichkeiten"
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs">Bestellt am</Label>
                  <Input
                    type="date"
                    value={role.appointedDate}
                    onChange={(e) =>
                      onUpdate(index, "appointedDate", e.target.value)
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Zeile hinzufügen
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Beteiligung (5.4)
// ============================================================================
function BeteiligungTab({
  participationMechanism,
  setParticipationMechanism,
}: {
  participationMechanism: string;
  setParticipationMechanism: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Konsultation und Beteiligung von Beschäftigten (Klausel 5.4)
        </CardTitle>
        <CardDescription>
          Die Organisation muss Prozesse für die Konsultation und Beteiligung
          von Beschäftigten auf allen zutreffenden Ebenen und in allen
          Funktionsbereichen einrichten, umsetzen und aufrechterhalten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="participationMechanism">
            Beteiligungs- und Konsultationsmechanismen
          </Label>
          <Textarea
            id="participationMechanism"
            value={participationMechanism}
            onChange={(e) => setParticipationMechanism(e.target.value)}
            placeholder="z.B. Regelmäßige ASA-Sitzungen, Mitarbeiterbefragungen, Gefährdungsmeldungen, Sicherheitsbeauftragte als Ansprechpartner, Unterweisungen mit Feedbackrunden, betriebliches Vorschlagswesen..."
            className="mt-1 min-h-[200px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
