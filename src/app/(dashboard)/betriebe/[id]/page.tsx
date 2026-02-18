import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Users,
  FileText,
  ClipboardCheck,
  FlaskConical,
  Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";

async function getCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      industry: true,
      categories: {
        include: { category: true },
        orderBy: { category: { sortOrder: "asc" } },
      },
      users: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: {
          documents: true,
          inspections: true,
          hazardousSubstances: true,
          machines: true,
          riskAssessments: true,
        },
      },
    },
  });
  return company;
}

export default async function BetriebDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await getCompany(params.id);

  if (!company) {
    notFound();
  }

  const categoryGroups = company.categories.reduce<
    Record<string, { code: string; name: string }[]>
  >((acc, cc) => {
    const group = cc.category.parentGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push({ code: cc.category.code, name: cc.category.name });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/betriebe">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {company.name}
            </h1>
            <Badge variant={company.isActive ? "default" : "secondary"}>
              {company.isActive ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {company.companyNumber && <span>Nr. {company.companyNumber}</span>}
            {company.industry && (
              <Badge variant="outline">{company.industry.name}</Badge>
            )}
            {company.legalForm && <span>{company.legalForm}</span>}
          </div>
        </div>
        <Button asChild>
          <Link href={`/betriebe/${company.id}/bearbeiten`}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{company._count.documents}</p>
              <p className="text-xs text-muted-foreground">Dokumente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {company._count.inspections}
              </p>
              <p className="text-xs text-muted-foreground">Begehungen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {company._count.hazardousSubstances}
              </p>
              <p className="text-xs text-muted-foreground">Gefahrstoffe</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Cog className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{company._count.machines}</p>
              <p className="text-xs text-muted-foreground">Maschinen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {company._count.riskAssessments}
              </p>
              <p className="text-xs text-muted-foreground">GBU</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stammdaten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Stammdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.street && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p>{company.street}</p>
                  <p>
                    {company.zip} {company.city}
                  </p>
                </div>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{company.email}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{company.website}</span>
              </div>
            )}
            {company.employeeCount && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{company.employeeCount} Mitarbeiter</span>
              </div>
            )}
            <Separator />
            {company.berufsgenossenschaft && (
              <div>
                <p className="text-sm font-medium">Berufsgenossenschaft</p>
                <p className="text-sm text-muted-foreground">
                  {company.berufsgenossenschaft}
                  {company.bgMemberNumber &&
                    ` (Nr. ${company.bgMemberNumber})`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ansprechpartner */}
        <Card>
          <CardHeader>
            <CardTitle>Ansprechpartner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.contactName ? (
              <>
                <p className="font-medium">{company.contactName}</p>
                {company.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{company.contactPhone}</span>
                  </div>
                )}
                {company.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{company.contactEmail}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Kein Ansprechpartner hinterlegt
              </p>
            )}

            {company.users.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Portal-Benutzer</p>
                  {company.users.map((cu) => (
                    <div
                      key={cu.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">
                        {cu.user.firstName} {cu.user.lastName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {cu.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {company.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Notizen</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {company.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dokumentkategorien */}
      {company.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relevante Dokumentkategorien</CardTitle>
            <CardDescription>
              {company.categories.length} Kategorien diesem Betrieb zugeordnet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryGroups).map(([group, cats]) => (
                <div key={group}>
                  <p className="text-sm font-medium mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {cats.map((cat) => (
                      <Badge key={cat.code} variant="secondary">
                        {cat.code} - {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
