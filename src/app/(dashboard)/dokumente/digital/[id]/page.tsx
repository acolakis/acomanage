import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { DigitalDocumentDetail } from "@/components/documents/digital/digital-document-detail";

interface Props {
  params: { id: string };
}

async function getDocument(id: string) {
  try {
    const document = await prisma.digitalDocument.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    return document;
  } catch {
    return null;
  }
}

export default async function DigitalDocumentPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const document = await getDocument(params.id);
  if (!document) notFound();

  if (!hasCompanyAccess(session, document.companyId)) notFound();

  return (
    <DigitalDocumentDetail
      document={JSON.parse(JSON.stringify(document))}
    />
  );
}
