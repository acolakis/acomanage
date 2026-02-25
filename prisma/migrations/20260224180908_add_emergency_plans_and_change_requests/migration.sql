-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('BRAND', 'CHEMIE', 'UNFALL', 'EVAKUIERUNG', 'NATURKATASTROPHE', 'STROMAUSFALL', 'SONSTIG');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('PROZESS', 'ARBEITSPLATZ', 'MATERIAL', 'ORGANISATION', 'SONSTIG');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('BEANTRAGT', 'BEWERTET', 'GENEHMIGT', 'UMGESETZT', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "emergency_plans" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emergency_type" "EmergencyType" NOT NULL,
    "description" TEXT,
    "procedures" TEXT,
    "responsible_persons" JSONB,
    "emergency_numbers" JSONB,
    "document_path" TEXT,
    "last_drill_date" DATE,
    "next_drill_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_drills" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "drill_date" DATE NOT NULL,
    "participants" TEXT,
    "duration" INTEGER,
    "findings" TEXT,
    "evaluation" TEXT,
    "improvement_actions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "change_number" TEXT,
    "title" TEXT NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "description" TEXT,
    "risks_before" TEXT,
    "risks_after" TEXT,
    "mitigations" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'BEANTRAGT',
    "requested_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "implemented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "emergency_plans" ADD CONSTRAINT "emergency_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_plans" ADD CONSTRAINT "emergency_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "emergency_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
