import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalDocumentFormRouter } from "@/components/documents/digital/form-router";
import {
  DIGITAL_CATEGORIES,
  CATEGORY_META,
  type DigitalCategoryCode,
} from "@/types/digital-documents";

interface Props {
  params: { categoryCode: string };
}

export default function ErstellenPage({ params }: Props) {
  const { categoryCode } = params;

  if (!DIGITAL_CATEGORIES.includes(categoryCode as DigitalCategoryCode)) {
    notFound();
  }

  const meta = CATEGORY_META[categoryCode];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dokumente">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dokument erstellen</h1>
          <p className="text-muted-foreground">
            {meta?.label || categoryCode} — {meta?.group || ""}
          </p>
        </div>
      </div>

      <DigitalDocumentFormRouter
        categoryCode={categoryCode as DigitalCategoryCode}
      />
    </div>
  );
}
