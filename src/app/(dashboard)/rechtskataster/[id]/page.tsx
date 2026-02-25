import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LegalDetail } from "@/components/legal/legal-detail";

export default async function RechtsanforderungDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const requirement = await prisma.legalRequirement.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!requirement || !requirement.isActive) return notFound();

  return <LegalDetail requirement={JSON.parse(JSON.stringify(requirement))} />;
}
