import Link from "next/link";
import { Plus, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter } from "@/lib/company-filter";
import { ReviewListFilter } from "@/components/management-reviews/review-list-filter";

async function getReviews() {
  try {
    const companyFilter = getSelectedCompanyFilter();
    return await prisma.managementReview.findMany({
      where: { ...companyFilter },
      include: {
        company: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function ManagementbewertungPage() {
  const reviews = await getReviews();

  const companyFilter = getSelectedCompanyFilter();
  const approvedCount = await prisma.managementReview
    .count({
      where: {
        ...companyFilter,
        approvedAt: { not: null },
      },
    })
    .catch(() => 0);

  const openCount = await prisma.managementReview
    .count({
      where: {
        ...companyFilter,
        approvedAt: null,
      },
    })
    .catch(() => 0);

  const serializedReviews = JSON.parse(JSON.stringify(reviews));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Managementbewertung
          </h1>
          <p className="text-muted-foreground">
            ISO 45001 Klausel 9.3 - {reviews.length} Bewertungen insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/managementbewertung/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neue Bewertung
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{reviews.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Genehmigt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReviewListFilter reviews={serializedReviews} />
    </div>
  );
}
