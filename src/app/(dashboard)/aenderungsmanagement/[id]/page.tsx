import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChangeRequestDetail } from "@/components/changes/change-detail";

export default async function AenderungsantragDetailPage({ params }: { params: { id: string } }) {
  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      requestedBy: { select: { firstName: true, lastName: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!changeRequest) return notFound();

  return <ChangeRequestDetail changeRequest={JSON.parse(JSON.stringify(changeRequest))} />;
}
