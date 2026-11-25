-- AlterTable
ALTER TABLE "inspections" ADD COLUMN     "report_file_name" TEXT,
ADD COLUMN     "report_path" TEXT,
ADD COLUMN     "report_source" TEXT,
ADD COLUMN     "report_updated_at" TIMESTAMP(3);

