import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ZielDetail } from "@/components/objectives/ziel-detail";

export default async function ZielDetailPage({ params }: { params: { id: string } }) {
  const objective = await prisma.ohsObjective.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      responsible: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      progress: {
        orderBy: { recordedAt: "desc" },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!objective) return notFound();

  return <ZielDetail objective={JSON.parse(JSON.stringify(objective))} />;
}
