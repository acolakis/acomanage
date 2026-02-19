-- CreateEnum
CREATE TYPE "ItemCheckStatus" AS ENUM ('UNCHECKED', 'IO', 'MANGEL');

-- AlterTable
ALTER TABLE "inspection_template_items" ADD COLUMN     "default_risk_level" "RiskLevel",
ADD COLUMN     "suggested_measure" TEXT;

-- CreateTable
CREATE TABLE "inspection_item_checks" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "template_item_id" TEXT NOT NULL,
    "status" "ItemCheckStatus" NOT NULL DEFAULT 'UNCHECKED',
    "note" TEXT,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_item_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspection_item_checks_inspection_id_template_item_id_key" ON "inspection_item_checks"("inspection_id", "template_item_id");

-- AddForeignKey
ALTER TABLE "inspection_item_checks" ADD CONSTRAINT "inspection_item_checks_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_item_checks" ADD CONSTRAINT "inspection_item_checks_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "inspection_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
