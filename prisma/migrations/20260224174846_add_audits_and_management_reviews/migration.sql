-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('SYSTEM', 'PROZESS', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "InternalAuditStatus" AS ENUM ('GEPLANT', 'IN_DURCHFUEHRUNG', 'BERICHT', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('ABWEICHUNG_SCHWER', 'ABWEICHUNG_LEICHT', 'VERBESSERUNG', 'POSITIV');

-- CreateTable
CREATE TABLE "internal_audits" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "audit_number" TEXT,
    "title" TEXT NOT NULL,
    "audit_type" "AuditType" NOT NULL,
    "iso_clause" TEXT,
    "status" "InternalAuditStatus" NOT NULL DEFAULT 'GEPLANT',
    "planned_date" DATE,
    "actual_date" DATE,
    "auditor_id" TEXT,
    "auditees" TEXT,
    "scope" TEXT,
    "summary" TEXT,
    "positive_findings" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "finding_number" INTEGER NOT NULL,
    "finding_type" "FindingType" NOT NULL,
    "iso_clause" TEXT,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "action_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_reviews" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "review_number" TEXT,
    "review_date" DATE NOT NULL,
    "status_previous_actions" TEXT,
    "changes_internal_external" TEXT,
    "ohs_performance" JSONB,
    "incident_summary" TEXT,
    "audit_results" TEXT,
    "consultation_results" TEXT,
    "risks_opportunities" TEXT,
    "objective_progress" TEXT,
    "ohs_fitness" TEXT,
    "improvement_needs" TEXT,
    "resource_needs" TEXT,
    "decisions" TEXT,
    "attendees" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "pdf_path" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "internal_audits" ADD CONSTRAINT "internal_audits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_audits" ADD CONSTRAINT "internal_audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_audits" ADD CONSTRAINT "internal_audits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "internal_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "corrective_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_reviews" ADD CONSTRAINT "management_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_reviews" ADD CONSTRAINT "management_reviews_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_reviews" ADD CONSTRAINT "management_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
