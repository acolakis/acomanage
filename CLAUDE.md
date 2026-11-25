# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AcoManage is an occupational safety management platform (Arbeitsschutz-Management-Plattform) for safety specialists (FaSi/SIFA) managing 10-50 companies. Built toward ISO 45001 compliance. The entire UI is in German. Route names, error messages, and labels are all German.

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack on port 3002
npm run build            # Production build (also runs ESLint + type checking)
npm run start            # Production start on port 3002
npm run lint             # ESLint only

# Database
docker compose up -d     # Start PostgreSQL 16
npm run db:migrate       # npx prisma migrate dev
npm run db:seed          # npx tsx prisma/seed.ts
npm run db:studio        # Prisma Studio GUI
npm run db:import-templates  # Import document files from external folder (prisma/import-templates.ts)
npx tsx prisma/seed-inspections.ts  # Seed inspection checklist templates (12 industry-specific)
npx tsx prisma/seed-trainings.ts    # Seed 20 training templates with structured sections
npx tsx prisma/seed-kpis.ts          # Seed 10 standard KPI definitions
```

There are no tests configured. Use `npm run build` as the primary verification step.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — JWT signing secret
- `NEXTAUTH_URL` — App URL (default `http://localhost:3002`)
- `CLAUDE_API_KEY` — Anthropic API key (for AI extraction features)
- `UPLOAD_DIR` — File upload directory (default `./uploads`)
- `INVITE_CODE` — Registration invite code

## Architecture

### Tech Stack
- **Next.js 14.2** (App Router, Turbopack dev) + TypeScript + Tailwind CSS + shadcn/ui
- **PostgreSQL 16** + **Prisma ORM v7** with `@prisma/adapter-pg` (adapter pattern)
- **NextAuth.js v4** (credentials provider, JWT sessions, 30-day expiry)
- **@react-pdf/renderer** for server-side PDF generation (8 legacy + 11 digital document PDF types)
- **@anthropic-ai/sdk** for Claude API integration (SDS/manual extraction, model: `claude-sonnet-4-6`)

Path alias: `@/*` maps to `./src/*` (configured in `tsconfig.json`). Use `@/lib/...`, `@/components/...`, etc. for all imports.

### Prisma v7 Setup
Prisma 7 uses an adapter pattern — the database URL is NOT in `schema.prisma` but in `prisma.config.ts` at the project root. The PrismaClient in `src/lib/prisma.ts` uses a `PrismaPg` adapter with `connectionString` from `DATABASE_URL`. Dev singleton pattern prevents multiple instances during hot reload.

### Route Structure

The app uses three route groups with separate layouts:
- `(dashboard)` — Admin/Employee area with full sidebar navigation (`Sidebar` + `Header`)
- `(portal)` — Client-only area with simplified sidebar (`PortalSidebar` + `Header`), read-only access
- `(auth)` — Login page

**Dashboard routes** (German names):
| Route | Purpose |
|---|---|
| `/dashboard` | Main overview with activity, deadlines, company stats |
| `/betriebe` | Company management (CRUD + `/neu`, `/[id]`, `/[id]/bearbeiten`) |
| `/benutzer` | User management (admin only, `/neu`, `/[id]`) |
| `/dokumente` | Document templates (Vorlagen tab) & digital documents (Digital tab) |
| `/begehungen` | Safety inspections with findings |
| `/gefahrstoffe` | Hazardous substances + AI GBA generation |
| `/maschinen` | Machine inventory (`/neu`, `/[id]`) |
| `/gefaehrdungsbeurteilungen` | Risk assessments (GBU, `/neu`, `/[id]`) |
| `/schulungen` | Trainings & instructions (`/neu`, `/[id]`) |
| `/vorfaelle` | Incident management (`/neu`, `/[id]`) |
| `/audits` | Internal audits (`/neu`, `/[id]`) |
| `/massnahmen` | Corrective actions (Korrekturmaßnahmen) |
| `/rechtskataster` | Legal requirements register |
| `/ziele` | Safety objectives & programs (`/neu`, `/[id]`) |
| `/kennzahlen` | KPI tracking & measurement |
| `/managementbewertung` | Management reviews (`/neu`, `/[id]`) |
| `/aenderungsmanagement` | Change management (MoC) |
| `/notfallplanung` | Emergency plans & drills |
| `/iso-dashboard` | ISO 45001 compliance overview |
| `/benachrichtigungen` | Notifications |
| `/einstellungen` | System settings (admin) |

**Portal routes** (client read-only access):
`/portal/{dokumente,begehungen,gefaehrdungsbeurteilungen,schulungen,audits,vorfaelle,benachrichtigungen}`

### Auth & Roles
Three roles: `ADMIN`, `EMPLOYEE`, `CLIENT`. Middleware in `src/middleware.ts` redirects CLIENT users to `/portal` and restricts `/benutzer` to ADMIN. Session carries `id`, `email`, `name` (computed), `role`, `companyIds` (see `src/types/next-auth.d.ts`).

### API Pattern
API routes live in `src/app/api/`. All require authentication via `getServerSession(authOptions)` except `/api/industries`. Error messages are in German. ~90 API route files total.

**Core modules:**
- `/api/companies/[id]` — CRUD + `/categories`, `/templates/[documentId]/download`, `/context` (+ `/pdf`)
- `/api/documents/[id]` — CRUD + `/assign`, `/propagate`, `/propagate-ba`, `/download`
- `/api/inspections/[id]` — CRUD + `/findings`, `/pdf`, `/photos`, `/item-checks`
- `/api/substances/[id]` — CRUD + `/gba` (PDF) + `/adopt-ba`
- `/api/machines/[id]` — CRUD + `/adopt-ba`
- `/api/risk-assessments/[id]` — CRUD + `/hazards`, `/pdf`

**ISO 45001 modules:**
- `/api/trainings/[id]` — CRUD + `/participants` (+ `/[participantId]`), `/pdf`
- `/api/training-templates` — GET training templates with structured sections
- `/api/incidents/[id]` — CRUD + `/photos`, `/pdf`
- `/api/audits/[id]` — CRUD + `/findings`, `/pdf`
- `/api/corrective-actions/[id]` — CRUD (linked from audits, incidents, inspections)
- `/api/legal-requirements/[id]` — CRUD (Rechtskataster)
- `/api/objectives/[id]` — CRUD + `/progress`
- `/api/kpis` — CRUD + `/values` for time-series data
- `/api/management-reviews/[id]` — CRUD + `/pdf`
- `/api/change-requests/[id]` — CRUD (MoC)
- `/api/emergency-plans/[id]` — CRUD + `/drills`
- `/api/competence-requirements/[id]` — CRUD

**Digital documents:**
- `/api/digital-documents` — GET (list with `?companyId`, `?categoryCode`, `?status` filters) + POST (create)
- `/api/digital-documents/[id]` — GET, PUT (partial update), DELETE (soft archive)
- `/api/digital-documents/[id]/pdf` — GET (generate PDF via dispatcher, returns 501 if renderer not implemented)

**Utilities:**
- `/api/notifications` — GET (list + unreadCount), PUT (markRead)
- `/api/ai/extract-sds` + `/api/ai/extract-manual` — Claude AI extraction
- `/api/inspection-import/{transcribe,analyze,create}` — GoodNotes checklist import (see below)
- `/api/ba-templates` — GET with `?type=substance|machine`
- `/api/export/{companies,inspections,substances,machines,risk-assessments,corrective-actions,audits,legal-requirements,incidents,trainings,management-reviews}` — CSV export
- `/api/settings` — System settings + `/test-email` + `/export`
- `/api/audit-log` — Audit trail viewer

### PDF Generation
PDF renderers export async `render*()` functions that call `renderToBuffer(<JSXComponent />)` and return a `Buffer`. API routes return the buffer as `new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf" } })`.

**Legacy PDFs** in `src/lib/pdf/*.tsx` — 8 types: inspection reports, GBA (hazardous substance), GBU (risk assessment), training reports, audit reports, incident reports, management review reports, SGA policy.

**Digital document PDFs** in `src/lib/pdf/documents/*.tsx` — 11 renderers dispatched via `renderDigitalDocument(categoryCode, document)` and `hasRenderer(categoryCode)` from `src/lib/pdf/documents/index.ts`. Multiple category codes share renderers (e.g., G01/G05/G06/IJ07/S02_EVAK/PQ02_UW all use `renderUnterweisungsnachweis`).

**Shared PDF components** in `src/lib/pdf/shared/`:
- `fonts.ts` — Registers NunitoSans font family (files in `src/assets/fonts/`). Must be imported as side-effect (`import "@/lib/pdf/shared/fonts"`) in every digital document renderer.
- `styles.ts` — Shared `colors` object and `baseStyles` (page margins/padding).
- `components.tsx` — Reusable `@react-pdf/renderer` components: `PageHeader`, `PageFooter`, `SectionTitle`, `InfoRow`, `InfoGrid`, `SignatureBlock`, `ChecklistItem`, `BulletList`, `NumberedList`, `ParticipantTable`, `PdfTable`, `CreatedWith`, `formatDate()`, etc.

### AI Integration
`src/lib/ai/sds-extractor.ts` uses the Anthropic SDK to extract structured data from safety data sheet PDFs via Claude's document processing (base64-encoded PDF → structured JSON). The `CLAUDE_API_KEY` env var is required.

### Company Filter System
Cookie-based company selection in the sidebar (`selectedCompanyId` cookie). Two helpers in `src/lib/company-filter.ts`:
- `getSelectedCompanyId()` — returns selected company ID or `null` (show all)
- `getSelectedCompanyFilter(field?)` — returns Prisma `where` clause (`{ companyId: id }` or `{}` if none selected)

Used in all Server Component pages to filter data. Returns `{}` when no company selected for backward compatibility. For the companies page itself, filter by `{ id: companyId }` instead.

### Template Personalization (DOCX)
`src/lib/docx-personalizer.ts` replaces text in .docx files via ZIP-based XML manipulation. Handles split runs (text fragmented across `<w:t>` tags). Processes document.xml, headers, footers, footnotes, endnotes.

`buildReplacementRules(sourceData, targetData)` generates rules sorted by string length (longest first) to prevent partial matches. Source data comes from `SystemSetting` table via `getTemplateSourceData()` in `src/lib/settings.ts`.

BA category codes: `IJ03` (Gefahrstoff-Betriebsanweisungen), `H01B` (Maschinen-Betriebsanweisungen). Multiple substances/machines can share one BA document (one-to-many relation).

### Auto-Assign Templates
`src/lib/auto-assign-templates.ts` — When a company is created with an industry, `autoAssignTemplates()` is called fire-and-forget to automatically assign industry-default document templates via `IndustryDefaultCategory` → `Document` lookup.

### Digital Documents System
Form-driven documents created entirely in-app (not uploaded DOCX templates). The `DigitalDocument` model stores structured `formData` as JSON per category code. 20 category codes across 6 groups defined in `src/types/digital-documents.ts`:

| Group | Codes |
|---|---|
| Unterweisungsnachweise | G01, G05, G06, IJ07, S02_EVAK, PQ02_UW |
| Bestellungsurkunden | B01, B01_AUSWEIS, S02, W01, A04 |
| Beauftragungen | A02, A03 |
| Aushänge | A01, S03, TV01 |
| Formulare | S06 |
| Informationsschreiben | G01_INFO, PQ01 |

**Auto-creation:** `src/lib/auto-create-digital-documents.ts` — When a company is created, `autoCreateDigitalDocuments()` is called fire-and-forget to create one draft `DigitalDocument` per category with pre-filled defaults.

**Form routing:** `DigitalDocumentFormRouter` (`src/components/documents/digital/form-router.tsx`) dispatches to the correct form component based on `categoryCode`. Forms use react-hook-form + zod for scalar fields and separate `useState` for complex array fields (topics, participants), merged on submit.

**Shared form components** in `src/components/documents/digital/shared/`: `ChecklistInput`, `ParticipantTableInput`, `StringListInput`.

**Pages:** `/dokumente` has two tabs (Vorlagen + Digital). `/dokumente/erstellen/[categoryCode]` for creation. `/dokumente/digital/[id]` for detail/edit view.

### GoodNotes Inspection Import
`/begehungen/import` turns a handwritten GoodNotes export of the paper checklist (A00–XYZ03) into an inspection. Code in `src/lib/inspection-import/`, routes in `/api/inspection-import/{transcribe,analyze,create}`.
1. **transcribe** — `pdftoppm` renders pages to JPEG (150 dpi) and only the images go to Claude. Never send the PDF itself: macOS embeds a wrong handwriting-OCR text layer that the model would trust. Pages are transcribed verbatim in parallel chunks of 4.
2. **analyze** — maps the transcription to the template items of `AWS Begehungsvorlage (A00–XYZ03)` (structured output) and cross-checks against last year's report from `/root/acomanagement/Berichte` (`findOldReport`) and the company's last digital inspection. Unclear handwriting is resolved from the report, and answers are corrected where the report shows they are wrong (`abgleich`: BESTAETIGT/KORRIGIERT/ABWEICHUNG/KEIN_VERGLEICH). `postProcess()` then flags overdue `nextTestDate` as MANGEL.
3. **create** — after the user reviews the result, creates inspection, item checks and findings in one transaction.
**transcribe** and **analyze** run as background jobs (`src/lib/inspection-import/jobs.ts`, in-memory on `globalThis`): they return `{ jobId }` (202) and the page polls `GET /api/inspection-import/jobs/[id]` every 3 s. Reason: `acomanage.aco-as.de` is behind Cloudflare, which cuts any request after 100 s (Safari then shows "The string did not match the expected pattern"). nginx has `proxy_read_timeout 900s` for `/api/inspection-import/`. Restarting the service kills running jobs.
Model: `claude-opus-5-5` (Sonnet 5.5 misread handwriting in tests), effort `high`. Override with `INSPECTION_IMPORT_MODEL`. Takes about 1–2 min to transcribe and 3–5 min to analyze for 11 pages.

### Digital Checklist (paper replacement)
The checklist tab of `/begehungen/[id]` renders each item with `ChecklistItemRow` (`src/components/inspections/checklist-item-row.tsx`): JA/NEIN/n.r. touch buttons plus always-visible "Datum / Aktuell", "Nächste Prüfung" and "Name / Bemerkung" fields that save on blur, with the previous inspection's values shown as "Vorjahr".
- **Prefill:** `POST /api/inspections` (with `templateId`, unless `prefill: false`) finds the company's last inspection with the same template (`findPreviousInspection` in `src/lib/inspection-prefill.ts`), sets `previousInspectionId` and copies note/test dates as `UNCHECKED` checks (n.r. stays n.r.). The import `create` route also sets `previousInspectionId`.
- **Overdue rule:** `POST /api/inspections/[id]/item-checks` turns `IO` into `MANGEL` when `nextTestDate` is before the inspection date and creates a finding if the item has none (response: `autoMangel`, `findingCreated`). Sending `lastTestDate`/`nextTestDate: null` clears the date; omitting it keeps it.

**Schnellerfassung Prüfdaten** (`QuickEntryDialog`, parser `src/lib/inspection-quick-entry.ts`): typed notes like "FL 07/26, 08/27" are split at line breaks/`;`/`,` (a segment without its own device belongs to the item before), matched to items via `ALIASES` or a typed item key, and dates are sorted by the inspection date (after → next test, before → last test; oldest device decides). Without a later date the next test is computed from `TEST_INTERVAL_MONTHS`. Unmatched lines go into `generalNotes`. Only open items are set to JA; `item-checks` POST without `status` keeps the stored status.

### Word Export (Begehungsbericht)
`POST /api/inspections/[id]/docx` starts a background job (`jobs.ts`), poll `GET ?job=<id>`, download with `&download=1`. `updateReport()` in `src/lib/docx/report-update.ts` takes last year's report from `/root/acomanagement/Berichte` (`findOldReport`), converts .doc → .docx (LibreOffice, own profile dir per run) and numbers all paragraphs with `scripts/docx-paragraphs.py extract` (leaf paragraphs of document/header/footer, with table position; paragraphs with fields/pictures are `fixed`). The report is split into ~18k-char parts edited in parallel by Claude (`IMPORT_MODEL`, structured output: replace / delete / insert_after / swap by paragraph number), then one dedupe call removes facts entered in several places, and `docx-paragraphs.py apply` writes the edits (changes red `CC0000`; `swap` replaces a passage across runs and works in fixed paragraphs, e.g. the header year). The result includes a check list: items with a result that the old report never mentions (`notInReport`) and AI hints. Overath (1,840 paragraphs): ~100 s, ~115 edits. The old `scripts/apply-docx-changes.py` (verbatim text replacement) is no longer used.
**Stored reports / year 2:** every export is saved with the inspection (`Inspection.reportPath/reportFileName/reportSource/reportUpdatedAt`, files in `uploads/inspections/<id>/`, `src/lib/docx/report-store.ts`); the user can upload the final Word version (`POST /api/inspections/[id]/report`, source `uploaded` – a later export never overwrites it; GET downloads, DELETE removes). `findBaseReport()` takes the stored report of the nearest earlier inspection of the company (linked previous first) and falls back to the Berichte folder. With a digital base, only topics that changed since that inspection go to the AI (`changedTopics`: different status/dates/note/findings, or a test date that expired in between); every such topic must produce an edit – topics without one get a second targeted pass, leftovers are listed as `notAdjusted`. Overath year-2 test: 9 changed / 108 unchanged topics, ~50 s.

### AI Cost Tracking & Model Choice
Every Claude call records tokens and USD cost in `AiUsage` (`recordUsage()` in `src/lib/ai/usage.ts`, list prices in `PRICES`; never throws). Overview: `GET /api/ai-usage`, shown in Einstellungen → KI-Integration (`AiUsageCard`); the Word export summary and the import review show the cost of that run.
The Word export sends a shared prefix (instructions + inspection data, `cache_control`) and one part per request; `runParts()` starts part 1 first and the others once it streams, because a cache entry is only readable after the first response starts streaming. Measured on Overath (first year, 5 parts): Opus 5.5 1.14 $ / 124 s, Sonnet 5.5 0.63 $ / 113 s – but Sonnet missed overdue items (annual instruction, Hubwagen, Putzmaschine), so the export stays on Opus (`REPORT_MODEL` env overrides). Output tokens are most of the cost.
Using a Claude Pro/Max subscription instead of the API is not permitted for app backends (Anthropic legal/compliance docs) and the server (2 vCPU, 5 GB RAM, no GPU) cannot run local models.

### Settings System
`src/lib/settings.ts` provides `getSystemSetting<T>(key, default)` and `setSystemSetting(key, value)` for the `SystemSetting` key-value table. Template source data keys: `template_source_company`, `template_source_street`, `template_source_zip`, `template_source_city`, `template_source_geschaeftsfuehrer`, `template_source_produktionsleiter`, `template_source_technischer_leiter`.

### Access Control
`src/lib/access-control.ts` provides `getCompanyFilter(session)` → `{ companyId: { in: session.user.companyIds } }` and `hasCompanyAccess(session, companyId)`. Used in ~10 API routes. For the companies route specifically, use `{ id: { in: session.user.companyIds } }` instead.

### Audit Logging
Fire-and-forget via `logAudit({...})` in `src/lib/audit.ts`. The function returns `void` (handles async internally) — do NOT chain `.catch()` on it.

### Pagination
Backward-compatible: without `?page=` → full array; with `?page=` → `{ data, pagination }`. Helpers: `parsePaginationParams()` + `paginatedResponse()` from `src/lib/pagination.ts`.

### Component Patterns
- **Forms**: react-hook-form + zod validation
- **Tables**: TanStack React Table v8
- **UI**: shadcn/ui components in `src/components/ui/`
- **Feature components**: `src/components/{companies,documents,users,substances,machines,inspections,trainings,audits,incidents,corrective-actions,legal,objectives,kpi,management-reviews,changes,emergency,iso-dashboard}/`
- **Layout**: `src/components/layout/{sidebar,portal-sidebar,header}.tsx`
- **Dashboard**: `src/components/dashboard/{recent-activity,upcoming-deadlines,company-overview}.tsx`

### Training System
Training templates (`TrainingTemplate`) have structured sections stored as `Json` field: `{ title: string; content: string; order: number }[]`. The `SectionEditor` component (`src/components/trainings/section-editor.tsx`) provides collapsible section editing with reordering. 20 pre-seeded templates cover all common training types (Brandschutz, Erste Hilfe, Gefahrstoffe, PSA, etc.). Training events (`TrainingEvent`) track participants with attendance and signature tracking.

## Key Conventions & Gotchas

### ESLint
Config extends `next/core-web-vitals` and `next/typescript`. The `_` prefix does **NOT** suppress unused variable warnings. To handle unused route handler parameters, remove the parameter entirely rather than prefixing with underscore.

### Soft Delete Patterns
- **Company**: `isActive: boolean` field
- **RiskAssessment / HazardousSubstance / Machine / DigitalDocument**: `status: "archived"` (no `deletedAt` field)
- **RiskAssessmentHazard**: No soft delete; cascades with parent assessment
- Always filter with `status: { not: "archived" }` or `isActive: true` in queries

### Prisma Model Name Mapping
The Prisma model `RiskAssessmentHazard` generates `prisma.riskAssessmentHazard` (not `prisma.hazard`). The relation field on the model uses `assessmentId` (not `riskAssessmentId`). `InspectionFinding` uses `deadline` (not `dueDate`) and `riskLevel` (not `priority`, nullable). Always check the actual model name in `schema.prisma`.

### Inspection System
12 industry-specific inspection templates seeded via `prisma/seed-inspections.ts` (run separately from main seed). Templates have sections → items with `suggestedMeasure` and `defaultRiskLevel`. `InspectionItemCheck` tracks per-item status with `ItemCheckStatus` enum: `UNCHECKED`, `IO`, `MANGEL`, `NICHT_RELEVANT`. Items marked `NICHT_RELEVANT` are excluded from PDF and progress calculation. Item checks support optional `lastTestDate`/`nextTestDate` for equipment inspection dates. The finding dialog supports photo upload (photos uploaded after finding creation). Multiple findings per checklist item are allowed.

### Enum Values
Inspection-related enums use UPPERCASE values: `INITIAL`, `REGULAR`, `FOLLOWUP`, `SPECIAL`, `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `SENT`, `NIEDRIG`, `MITTEL`, `HOCH`, `KRITISCH`, `OPEN`. `ItemCheckStatus`: `UNCHECKED`, `IO`, `MANGEL`, `NICHT_RELEVANT`. Risk assessment status uses lowercase strings: `draft`, `active`, `review_needed`, `archived`.

### User Model
The User model has `firstName` and `lastName` — there is no `name` field. The session's `name` is a computed `${firstName} ${lastName}` string set during login.

### shadcn/ui Select
Radix Select requires a non-empty string value. Use a sentinel like `"__none__"` for "no selection" options.

### Date Formatting
All date formatting uses `toLocaleDateString("de-DE", ...)` — no external date library. Always use `de-DE` locale for user-facing dates.

### Data Serialization
Use `JSON.parse(JSON.stringify(data))` when passing Prisma query results to client components (strips Date objects, Prisma types) and when writing to Prisma `Json` fields (e.g., `SdsExtraction`, `ManualExtraction` models).

### File Uploads
Documents are stored in `uploads/documents/{category}/{uuid}_{filename}`. Inspection photos in `uploads/inspections/{inspectionId}/{uuid}.ext`. Incident photos in `uploads/incidents/{incidentId}/{uuid}.ext`. Multipart form data handling in API routes. The `uploads/` directory is a Docker volume.

### Notifications & Email
Fire-and-forget email sending via SMTP config from `SystemSetting` table (`getSmtpConfig()`). Templates in `src/lib/email-templates.ts` (German). Never blocks the main flow.

### Buffer in NextResponse
Never pass `Buffer` directly to `new NextResponse()` — always wrap with `new Uint8Array(buffer)`. Applies to all PDF routes and CSV export routes.

### CSV Export Pattern
All CSV exports use UTF-8 BOM (`\uFEFF`) + semicolon separator (`;`) for German Excel compatibility. Return as `new Uint8Array(Buffer.from(csvContent, "utf-8"))` with `Content-Type: text/csv; charset=utf-8`.

### Mobile Layout
Layouts use `h-screen overflow-hidden` on the outer container with `overflow-y-auto` on `<main>` for proper mobile scrolling. Header uses `shrink-0` (not `sticky top-0`).

## Database

Connection: `postgresql://acomanage:acomanage_secret@localhost:5432/acomanage`
Admin login: `admin@acomanage.de` / `AcoManage2024!`

The main seed (`prisma/seed.ts`) creates 62 document categories (from real A01–XYZ03 folder structure), 12 industries with 534 default category mappings, and the admin user. Document files are imported from an external folder via `npm run db:import-templates` (`prisma/import-templates.ts`). Inspection checklist templates are seeded separately via `npx tsx prisma/seed-inspections.ts` (12 industry-specific templates with ~400 items total). Training templates are seeded via `npx tsx prisma/seed-trainings.ts` (20 templates with 8-12 structured sections each).

**Important:** `tsconfig.json` excludes `prisma/seed*.ts` and `prisma/deactivate-*.ts` — do NOT remove these exclusions. These scripts create their own PrismaClient with a standalone `pg` Pool (they don't use `src/lib/prisma.ts`).
