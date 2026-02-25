-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('UNFALL', 'BEINAHEUNFALL', 'VORFALL', 'BERUFSKRANKHEIT', 'ERSTEHILFE');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('GERING', 'MITTEL', 'SCHWER', 'TOEDLICH');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('GEMELDET', 'IN_UNTERSUCHUNG', 'MASSNAHMEN', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "RootCauseCategory" AS ENUM ('MENSCH', 'TECHNIK', 'ORGANISATION', 'UMGEBUNG');

-- CreateEnum
CREATE TYPE "ActionSourceType" AS ENUM ('BEGEHUNG', 'GBU', 'VORFALL', 'AUDIT', 'MANAGEMENT_REVIEW', 'EXTERN', 'SONSTIG');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('NIEDRIG', 'MITTEL', 'HOCH', 'SOFORT');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OFFEN', 'IN_BEARBEITUNG', 'UMGESETZT', 'WIRKSAMKEIT_GEPRUEFT', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "EffectivenessResult" AS ENUM ('WIRKSAM', 'TEILWEISE', 'UNWIRKSAM');

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "incident_number" TEXT,
    "incident_type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'GEMELDET',
    "incident_date" DATE NOT NULL,
    "incident_time" TEXT,
    "location" TEXT,
    "department" TEXT,
    "description" TEXT NOT NULL,
    "affected_person" TEXT,
    "affected_role" TEXT,
    "witnesses" TEXT,
    "root_cause" TEXT,
    "root_cause_category" "RootCauseCategory",
    "contributing_factors" TEXT,
    "investigated_by" TEXT,
    "investigated_at" TIMESTAMP(3),
    "injury_type" TEXT,
    "body_part" TEXT,
    "lost_work_days" INTEGER,
    "bg_reportable" BOOLEAN NOT NULL DEFAULT false,
    "bg_report_date" DATE,
    "bg_report_number" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_photos" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "action_number" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_type" "ActionSourceType" NOT NULL,
    "source_id" TEXT,
    "source_reference" TEXT,
    "priority" "ActionPriority" NOT NULL DEFAULT 'MITTEL',
    "status" "ActionStatus" NOT NULL DEFAULT 'OFFEN',
    "measure_type" TEXT,
    "responsible_id" TEXT,
    "deadline" DATE,
    "completed_at" TIMESTAMP(3),
    "effectiveness_check" TEXT,
    "effectiveness_date" DATE,
    "effectiveness_result" "EffectivenessResult",
    "effectiveness_by" TEXT,
    "incident_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_investigated_by_fkey" FOREIGN KEY ("investigated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_effectiveness_by_fkey" FOREIGN KEY ("effectiveness_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
