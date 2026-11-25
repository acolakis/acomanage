"use client";

import { DigitalCategoryCode, CATEGORY_META } from "@/types/digital-documents";
import { UnterweisungsnachweisForm } from "./forms/unterweisungsnachweis-form";
import { BestellungsurkundeForm } from "./forms/bestellungsurkunde-form";
import { B01AusweisForm } from "./forms/b01-ausweis-form";
import { A02Form } from "./forms/a02-form";
import { A03Form } from "./forms/a03-form";
import { A01Form } from "./forms/a01-form";
import { S03Form } from "./forms/s03-form";
import { S06Form } from "./forms/s06-form";
import { TV01Form } from "./forms/tv01-form";
import { G01InfoForm } from "./forms/g01-info-form";
import { PQ01Form } from "./forms/pq01-form";

// Categories handled by each form
const UNTERWEISUNGSNACHWEIS_CODES = ["G01", "G05", "G06", "IJ07", "S02_EVAK", "PQ02_UW"];
const BESTELLUNGSURKUNDE_CODES = ["B01", "S02", "W01", "A04"];

// Map for single-category forms
const SINGLE_FORMS: Record<string, React.ComponentType<{ categoryCode: DigitalCategoryCode; initialData?: { id: string; companyId: string; formData: Record<string, unknown> } }>> = {
  B01_AUSWEIS: B01AusweisForm,
  A02: A02Form,
  A03: A03Form,
  A01: A01Form,
  S03: S03Form,
  S06: S06Form,
  TV01: TV01Form,
  G01_INFO: G01InfoForm,
  PQ01: PQ01Form,
};

interface FormRouterProps {
  categoryCode: DigitalCategoryCode;
  initialData?: {
    id: string;
    companyId: string;
    formData: Record<string, unknown>;
  };
}

export function DigitalDocumentFormRouter({
  categoryCode,
  initialData,
}: FormRouterProps) {
  if (UNTERWEISUNGSNACHWEIS_CODES.includes(categoryCode)) {
    return (
      <UnterweisungsnachweisForm
        categoryCode={categoryCode}
        initialData={initialData}
      />
    );
  }

  if (BESTELLUNGSURKUNDE_CODES.includes(categoryCode)) {
    return (
      <BestellungsurkundeForm
        categoryCode={categoryCode}
        initialData={initialData}
      />
    );
  }

  const SingleForm = SINGLE_FORMS[categoryCode];
  if (SingleForm) {
    return <SingleForm categoryCode={categoryCode} initialData={initialData} />;
  }

  // Fallback for not-yet-implemented categories
  const meta = CATEGORY_META[categoryCode];
  return (
    <div className="rounded-lg border p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">
        {meta?.label || categoryCode}
      </h3>
      <p className="text-muted-foreground">
        Das Formular für diese Dokumentkategorie wird in Kürze verfügbar sein.
      </p>
    </div>
  );
}
