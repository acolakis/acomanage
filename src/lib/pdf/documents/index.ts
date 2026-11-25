import { DigitalCategoryCode } from "@/types/digital-documents";
import { renderUnterweisungsnachweis } from "./unterweisungsnachweis";
import { renderBestellungsurkunde } from "./bestellungsurkunde";
import { renderB01Sicherheitsausweis } from "./b01-sicherheitsausweis";
import { renderA02Pflichtuebertragung } from "./a02-pflichtuebertragung";
import { renderA03BeauftragungFahrzeuge } from "./a03-beauftragung-fahrzeuge";
import { renderA01Grundsatzerklaerung } from "./a01-grundsatzerklaerung";
import { renderS03Brandschutzordnung } from "./s03-brandschutzordnung";
import { renderS06Feuererlaubnisschein } from "./s06-feuererlaubnisschein";
import { renderTV01Unfallverhalten } from "./tv01-unfallverhalten";
import { renderG01Arbeitsschutzinfo } from "./g01-arbeitsschutzinfo";
import { renderPQ01Fremdfirmen } from "./pq01-fremdfirmen";

// Dispatcher: Maps categoryCode → PDF render function
// Each renderer returns a Buffer. Renderers are added as they are implemented.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderFn = (document: any) => Promise<Buffer>;

const renderers: Partial<Record<DigitalCategoryCode, RenderFn>> = {
  // Pattern 1: Unterweisungsnachweis (6 categories)
  G01: renderUnterweisungsnachweis,
  G05: renderUnterweisungsnachweis,
  G06: renderUnterweisungsnachweis,
  IJ07: renderUnterweisungsnachweis,
  S02_EVAK: renderUnterweisungsnachweis,
  PQ02_UW: renderUnterweisungsnachweis,
  // Pattern 2: Bestellungsurkunde (4 categories + Ausweis)
  B01: renderBestellungsurkunde,
  B01_AUSWEIS: renderB01Sicherheitsausweis,
  S02: renderBestellungsurkunde,
  W01: renderBestellungsurkunde,
  A04: renderBestellungsurkunde,
  // Pattern 3: Beauftragungen
  A02: renderA02Pflichtuebertragung,
  A03: renderA03BeauftragungFahrzeuge,
  // Pattern 4: Aushänge / Sonderdokumente
  A01: renderA01Grundsatzerklaerung,
  S03: renderS03Brandschutzordnung,
  S06: renderS06Feuererlaubnisschein,
  TV01: renderTV01Unfallverhalten,
  // Pattern 5: Informationsschreiben
  G01_INFO: renderG01Arbeitsschutzinfo,
  PQ01: renderPQ01Fremdfirmen,
};

export async function renderDigitalDocument(
  categoryCode: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const renderer = renderers[categoryCode as DigitalCategoryCode];
  if (!renderer) {
    throw new Error(
      `Kein PDF-Renderer für Kategorie "${categoryCode}" verfügbar`
    );
  }
  return renderer(document);
}

export function hasRenderer(categoryCode: string): boolean {
  return categoryCode in renderers;
}

export { renderers };
