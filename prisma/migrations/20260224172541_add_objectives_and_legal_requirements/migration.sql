-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('ENTWURF', 'AKTIV', 'ERREICHT', 'NICHT_ERREICHT', 'ARCHIVIERT');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('OFFEN', 'KONFORM', 'TEILWEISE', 'NICHT_KONFORM');

-- CreateTable
CREATE TABLE "ohs_objectives" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_value" TEXT,
    "current_value" TEXT,
    "unit" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ENTWURF',
    "responsible_id" TEXT,
    "start_date" DATE,
    "target_date" DATE,
    "iso_clause" TEXT,
    "related_risk_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ohs_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_progress" (
    "id" TEXT NOT NULL,
    "objective_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT,

    CONSTRAINT "objective_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_requirements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_title" TEXT,
    "section" TEXT,
    "description" TEXT,
    "relevance" TEXT,
    "compliance_status" "ComplianceStatus" NOT NULL DEFAULT 'OFFEN',
    "compliance_notes" TEXT,
    "last_review_date" DATE,
    "next_review_date" DATE,
    "source_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_requirements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ohs_objectives" ADD CONSTRAINT "ohs_objectives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ohs_objectives" ADD CONSTRAINT "ohs_objectives_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ohs_objectives" ADD CONSTRAINT "ohs_objectives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_progress" ADD CONSTRAINT "objective_progress_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "ohs_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_progress" ADD CONSTRAINT "objective_progress_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_requirements" ADD CONSTRAINT "legal_requirements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_requirements" ADD CONSTRAINT "legal_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
