import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UnterweisungDetail } from "@/components/unterweisungen/unterweisung-detail";

export default async function UnterweisungDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const unterweisung = await prisma.unterweisung.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!unterweisung || unterweisung.status === "archiviert") {
    return notFound();
  }

  return (
    <UnterweisungDetail
      unterweisung={JSON.parse(JSON.stringify(unterweisung))}
    />
  );
}
