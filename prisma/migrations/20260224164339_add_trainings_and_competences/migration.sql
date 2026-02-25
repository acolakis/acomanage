-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('ERSTUNTERWEISUNG', 'UNTERWEISUNG', 'FORTBILDUNG', 'ZERTIFIKAT', 'ERSTE_HILFE', 'BRANDSCHUTZ', 'GEFAHRSTOFF', 'PSA', 'MASCHINE', 'ELEKTRO', 'HOEHENARBEIT', 'STAPLERFAHRER', 'BILDSCHIRMARBEIT', 'SONSTIG');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('GEPLANT', 'DURCHGEFUEHRT', 'ABGESAGT', 'UEBERFAELLIG');

-- CreateTable
CREATE TABLE "training_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "training_type" "TrainingType" NOT NULL,
    "description" TEXT,
    "legal_basis" TEXT,
    "target_group" TEXT,
    "content" TEXT,
    "recurrence_months" INTEGER,
    "duration_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "training_type" "TrainingType" NOT NULL,
    "description" TEXT,
    "legal_basis" TEXT,
    "content" TEXT,
    "instructor" TEXT,
    "location" TEXT,
    "training_date" DATE,
    "start_time" TEXT,
    "duration" INTEGER,
    "status" "TrainingStatus" NOT NULL DEFAULT 'GEPLANT',
    "recurrence_months" INTEGER,
    "next_due_date" DATE,
    "signature_doc_path" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_participants" (
    "id" TEXT NOT NULL,
    "training_id" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "department" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "signed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competence_requirements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "legal_basis" TEXT,
    "recurrence_months" INTEGER,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competence_requirements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "training_events" ADD CONSTRAINT "training_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_events" ADD CONSTRAINT "training_events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "training_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_events" ADD CONSTRAINT "training_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_requirements" ADD CONSTRAINT "competence_requirements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_requirements" ADD CONSTRAINT "competence_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
