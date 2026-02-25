import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IncidentDetail } from "@/components/incidents/incident-detail";

export default async function VorfallDetailPage({ params }: { params: { id: string } }) {
  const incident = await prisma.incident.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, city: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      investigatedBy: { select: { firstName: true, lastName: true } },
      photos: { orderBy: { sortOrder: "asc" } },
      actions: {
        include: {
          responsible: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!incident) return notFound();

  return <IncidentDetail incident={JSON.parse(JSON.stringify(incident))} />;
}
