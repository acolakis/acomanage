import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotfallplanDetail } from "@/components/emergency/notfallplan-detail";

export default async function NotfallplanDetailPage({ params }: { params: { id: string } }) {
  const plan = await prisma.emergencyPlan.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      drills: {
        orderBy: { drillDate: "desc" },
      },
    },
  });

  if (!plan) return notFound();

  return <NotfallplanDetail plan={JSON.parse(JSON.stringify(plan))} />;
}
