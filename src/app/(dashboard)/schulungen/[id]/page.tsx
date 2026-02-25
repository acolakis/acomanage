import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrainingDetail } from "@/components/trainings/training-detail";

export default async function SchulungDetailPage({ params }: { params: { id: string } }) {
  const training = await prisma.trainingEvent.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      template: { select: { id: true, title: true } },
      participants: { orderBy: { participantName: "asc" } },
    },
  });

  if (!training) return notFound();

  return <TrainingDetail training={JSON.parse(JSON.stringify(training))} />;
}
