import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PortalDokumentePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const companyIds = (session.user as { companyIds?: string[] }).companyIds ?? [];

  const companyDocs = await prisma.companyDocument.findMany({
    where: { companyId: { in: companyIds } },
    include: {
      document: {
        include: {
          category: { select: { code: true, name: true, parentGroup: true } },
        },
      },
      company: { select: { name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Group by category parentGroup
  const grouped: Record<
    string,
    {
      docs: typeof companyDocs;
      categories: Set<string>;
    }
  > = {};

  for (const cd of companyDocs) {
    const group = cd.document.category?.parentGroup || "Sonstige";
    if (!grouped[group]) {
      grouped[group] = { docs: [], categories: new Set() };
    }
    grouped[group].docs.push(cd);
    if (cd.document.category) {
      grouped[group].categories.add(cd.document.category.name);
    }
  }

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b, "de")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
        <p className="text-muted-foreground">
          {companyDocs.length} Dokumente verfügbar
        </p>
      </div>

      {sortedGroups.length > 0 ? (
        sortedGroups.map(([group, data]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.docs.map((cd) => (
                  <div
                    key={cd.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {cd.document.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {cd.document.category && (
                            <Badge variant="outline" className="text-xs">
                              {cd.document.category.code}
                            </Badge>
                          )}
                          <span>{cd.company.name}</span>
                          {cd.document.fileType && (
                            <span>{cd.document.fileType.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {cd.document.filePath && (
                      <a
                        href={`/api/documents/${cd.documentId}/download`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Dokumente verfügbar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
