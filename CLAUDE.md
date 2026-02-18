# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AcoManage is an occupational safety management platform (Arbeitsschutz-Management-Plattform) for safety specialists (FaSi/SIFA) managing 10-50 companies. The entire UI is in German. Route names, error messages, and labels are all German.

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
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
- **Next.js 14.2** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **PostgreSQL 16** + **Prisma ORM v7** with `@prisma/adapter-pg` (adapter pattern)
- **NextAuth.js v4** (credentials provider, JWT sessions)
- **@react-pdf/renderer** for server-side PDF generation
- **@anthropic-ai/sdk** for Claude API integration (SDS extraction)

### Prisma v7 Setup
Prisma 7 uses an adapter pattern — the database URL is NOT in `schema.prisma` but in `prisma.config.ts` at the project root. The PrismaClient in `src/lib/prisma.ts` requires a `PrismaPg` adapter instance.

### Route Structure

The app uses two route groups with separate layouts:
- `(dashboard)` — Admin/Employee area with full sidebar navigation
- `(portal)` — Client-only area with simplified sidebar, read-only access

**German route names** (not English):
| Route | Purpose |
|---|---|
| `/betriebe` | Company management |
| `/benutzer` | User management (admin only) |
| `/dokumente` | Document templates & propagation |
| `/begehungen` | Safety inspections |
| `/gefahrstoffe` | Hazardous substances + AI GBA generation |
| `/maschinen` | Machine inventory + MBA generation |
| `/gefaehrdungsbeurteilungen` | Risk assessments (GBU) |
| `/benachrichtigungen` | Notifications |
| `/einstellungen` | System settings (admin) |
| `/portal/*` | Client portal (mirrors above, read-only) |

### Auth & Roles
Three roles: `ADMIN`, `EMPLOYEE`, `CLIENT`. Middleware in `src/middleware.ts` redirects CLIENT users to `/portal` and restricts `/benutzer` to ADMIN. Session carries `id`, `role`, `companyIds` (see `src/types/next-auth.d.ts`).

### API Pattern
API routes live in `src/app/api/`. All require authentication via `getServerSession(authOptions)` except `/api/industries`. Error messages are in German.

### PDF Generation
PDF renderers in `src/lib/pdf/*.tsx` export async `render*()` functions that call `renderToBuffer(<JSXComponent />)` and return a `Buffer`. API routes return the buffer as `new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf" } })`.

### AI Integration
`src/lib/ai/sds-extractor.ts` uses the Anthropic SDK to extract structured data from safety data sheet PDFs via Claude's document processing. The `CLAUDE_API_KEY` env var is required.

## Key Conventions & Gotchas

### ESLint
Config extends `next/core-web-vitals` and `next/typescript`. The `_` prefix does **NOT** suppress unused variable warnings. To handle unused route handler parameters, remove the parameter entirely rather than prefixing with underscore.

### Soft Delete Patterns
- **Company**: `isActive: boolean` field
- **RiskAssessment / HazardousSubstance / Machine**: `status: "archived"` (no `deletedAt` field)
- **RiskAssessmentHazard**: No soft delete; cascades with parent assessment

### Prisma Model Name Mapping
The Prisma model `RiskAssessmentHazard` generates `prisma.riskAssessmentHazard` (not `prisma.hazard`). Always check the actual model name in `schema.prisma`.

### Enum Values
Inspection-related enums use UPPERCASE values: `INITIAL`, `REGULAR`, `FOLLOWUP`, `SPECIAL`, `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `SENT`, `NIEDRIG`, `MITTEL`, `HOCH`, `KRITISCH`, `OPEN`. Risk assessment status uses lowercase strings: `draft`, `active`, `review_needed`, `archived`.

### User Model
The User model has `firstName` and `lastName` — there is no `name` field. The session's `name` is a computed `${firstName} ${lastName}` string set during login.

### shadcn/ui Select
Radix Select requires a non-empty string value. Use a sentinel like `"__none__"` for "no selection" options.

### Data Serialization
Use `JSON.parse(JSON.stringify(data))` when passing Prisma query results to client components (strips Date objects, Prisma types) and when writing to Prisma `Json` fields.

## Database

Connection: `postgresql://acomanage:acomanage_secret@localhost:5432/acomanage`
Admin login: `admin@acomanage.de` / `AcoManage2024!`

The seed creates 62 document categories (from real A01–XYZ03 folder structure), 12 industries with 534 default category mappings, and the admin user.
