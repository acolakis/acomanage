# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AcoManage is an occupational safety management platform (Arbeitsschutz-Management-Plattform) for safety specialists (FaSi/SIFA) managing 10-50 companies. The entire UI is in German. Route names, error messages, and labels are all German.

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (next dev --turbo)
npm run build            # Production build (also runs ESLint + type checking)
npm run lint             # ESLint only

# Database
docker compose up -d     # Start PostgreSQL 16
npm run db:migrate       # npx prisma migrate dev
npm run db:seed          # npx tsx prisma/seed.ts
npm run db:studio        # Prisma Studio GUI
```

There are no tests configured. Use `npm run build` as the primary verification step.

## Architecture

### Tech Stack
- **Next.js 14.2** (App Router, Turbopack dev) + TypeScript + Tailwind CSS + shadcn/ui
- **PostgreSQL 16** + **Prisma ORM v7** with `@prisma/adapter-pg` (adapter pattern)
- **NextAuth.js v4** (credentials provider, JWT sessions, 30-day expiry)
- **@react-pdf/renderer** for server-side PDF generation
- **@anthropic-ai/sdk** for Claude API integration (SDS/manual extraction, model: `claude-sonnet-4-6`)

### Prisma v7 Setup
Prisma 7 uses an adapter pattern — the database URL is NOT in `schema.prisma` but in `prisma.config.ts` at the project root. The PrismaClient in `src/lib/prisma.ts` requires a `PrismaPg` adapter instance.

### Route Structure

The app uses two route groups with separate layouts:
- `(dashboard)` — Admin/Employee area with full sidebar navigation (`Sidebar` + `Header`)
- `(portal)` — Client-only area with simplified sidebar (`PortalSidebar` + `Header`), read-only access
- `(auth)` — Login page

**German route names** (not English):
| Route | Purpose |
|---|---|
| `/dashboard` | Main overview |
| `/betriebe` | Company management (CRUD + `/neu`, `/[id]`, `/[id]/bearbeiten`) |
| `/benutzer` | User management (admin only, `/neu`, `/[id]`) |
| `/dokumente` | Document templates & propagation |
| `/begehungen` | Safety inspections with findings |
| `/gefahrstoffe` | Hazardous substances + AI GBA generation |
| `/maschinen` | Machine inventory (`/neu`, `/[id]`) |
| `/gefaehrdungsbeurteilungen` | Risk assessments (GBU, `/neu`, `/[id]`) |
| `/benachrichtigungen` | Notifications |
| `/einstellungen` | System settings (admin) |
| `/portal/*` | Client portal (dokumente, begehungen, gefaehrdungsbeurteilungen, benachrichtigungen) |

### Auth & Roles
Three roles: `ADMIN`, `EMPLOYEE`, `CLIENT`. Middleware in `src/middleware.ts` redirects CLIENT users to `/portal` and restricts `/benutzer` to ADMIN. Session carries `id`, `email`, `name` (computed), `role`, `companyIds` (see `src/types/next-auth.d.ts`).

### API Pattern
API routes live in `src/app/api/`. All require authentication via `getServerSession(authOptions)` except `/api/industries`. Error messages are in German. Key API groups:
- `/api/companies/[id]` — CRUD + `/categories`, `/templates/[documentId]/download`
- `/api/documents/[id]` — CRUD + `/assign`, `/propagate`, `/propagate-ba`, `/download`
- `/api/inspections/[id]` — CRUD + `/findings`, `/pdf`, `/photos`
- `/api/substances/[id]` — CRUD + `/gba` (PDF) + `/adopt-ba`
- `/api/machines/[id]` — CRUD + `/adopt-ba`
- `/api/risk-assessments/[id]` — CRUD + `/hazards`, `/pdf`
- `/api/notifications` — GET (list + unreadCount), PUT (markRead)
- `/api/ai/extract-sds` — Claude AI extraction from SDS PDFs
- `/api/ba-templates` — GET with `?type=substance|machine`, lists IJ03/H01B templates with usage info
- `/api/export/{companies,inspections,substances,machines,risk-assessments}` — CSV export (UTF-8 BOM + semicolon separator)

### PDF Generation
PDF renderers in `src/lib/pdf/*.tsx` export async `render*()` functions that call `renderToBuffer(<JSXComponent />)` and return a `Buffer`. API routes return the buffer as `new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf" } })`. Three PDF types: inspection reports, GBA (hazardous substance), GBU (risk assessment).

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
- **Feature components**: `src/components/{companies,documents,users,substances,machines}/`
- **Layout**: `src/components/layout/{sidebar,portal-sidebar,header}.tsx`

## Key Conventions & Gotchas

### ESLint
Config extends `next/core-web-vitals` and `next/typescript`. The `_` prefix does **NOT** suppress unused variable warnings. To handle unused route handler parameters, remove the parameter entirely rather than prefixing with underscore.

### Soft Delete Patterns
- **Company**: `isActive: boolean` field
- **RiskAssessment / HazardousSubstance / Machine**: `status: "archived"` (no `deletedAt` field)
- **RiskAssessmentHazard**: No soft delete; cascades with parent assessment
- Always filter with `status: { not: "archived" }` or `isActive: true` in queries

### Prisma Model Name Mapping
The Prisma model `RiskAssessmentHazard` generates `prisma.riskAssessmentHazard` (not `prisma.hazard`). The relation field on the model uses `assessmentId` (not `riskAssessmentId`). Always check the actual model name in `schema.prisma`.

### Enum Values
Inspection-related enums use UPPERCASE values: `INITIAL`, `REGULAR`, `FOLLOWUP`, `SPECIAL`, `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `SENT`, `NIEDRIG`, `MITTEL`, `HOCH`, `KRITISCH`, `OPEN`. Risk assessment status uses lowercase strings: `draft`, `active`, `review_needed`, `archived`.

### User Model
The User model has `firstName` and `lastName` — there is no `name` field. The session's `name` is a computed `${firstName} ${lastName}` string set during login.

### shadcn/ui Select
Radix Select requires a non-empty string value. Use a sentinel like `"__none__"` for "no selection" options.

### Data Serialization
Use `JSON.parse(JSON.stringify(data))` when passing Prisma query results to client components (strips Date objects, Prisma types) and when writing to Prisma `Json` fields (e.g., `SdsExtraction`, `ManualExtraction` models).

### File Uploads
Documents are stored in `uploads/documents/{category}/{uuid}_{filename}`. Multipart form data handling in API routes. The `uploads/` directory is a Docker volume.

### Notifications & Email
Fire-and-forget email sending via SMTP config from `SystemSetting` table (`getSmtpConfig()`). Templates in `src/lib/email-templates.ts` (German). Never blocks the main flow.

## Database

Connection: `postgresql://acomanage:acomanage_secret@localhost:5432/acomanage`
Admin login: `admin@acomanage.de` / `AcoManage2024!`

The seed creates 62 document categories (from real A01–XYZ03 folder structure), 12 industries with 534 default category mappings, and the admin user.
