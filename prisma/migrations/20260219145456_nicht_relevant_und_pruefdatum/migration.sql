-- AlterEnum
ALTER TYPE "ItemCheckStatus" ADD VALUE 'NICHT_RELEVANT';

-- AlterTable
ALTER TABLE "inspection_item_checks" ADD COLUMN     "last_test_date" TIMESTAMP(3),
ADD COLUMN     "next_test_date" TIMESTAMP(3);
