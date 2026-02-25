import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewDetail } from "@/components/management-reviews/review-detail";

export default async function ManagementbewertungDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const review = await prisma.managementReview.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!review) return notFound();

  return <ReviewDetail review={JSON.parse(JSON.stringify(review))} />;
}
