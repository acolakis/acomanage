import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ActionDetail } from "@/components/corrective-actions/action-detail";

async function getAction(id: string) {
  try {
    const action = await prisma.correctiveAction.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        effectivenessBy: { select: { firstName: true, lastName: true } },
        incident: {
          select: {
            id: true,
            incidentNumber: true,
            incidentType: true,
            description: true,
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    return action;
  } catch {
    return null;
  }
}

export default async function MassnahmeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const action = await getAction(params.id);

  if (!action) {
    notFound();
  }

  const serializedAction = JSON.parse(JSON.stringify(action));

  return <ActionDetail action={serializedAction} />;
}
