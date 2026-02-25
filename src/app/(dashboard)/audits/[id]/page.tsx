import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuditDetail } from "@/components/audits/audit-detail";

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const audit = await prisma.internalAudit.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      auditor: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      findings: {
        include: {
          action: {
            select: {
              id: true,
              actionNumber: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: { findingNumber: "asc" },
      },
    },
  });

  if (!audit) return notFound();

  return <AuditDetail audit={JSON.parse(JSON.stringify(audit))} />;
}
