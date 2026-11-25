-- CreateTable
CREATE TABLE "digital_documents" (
    "id" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "form_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "digital_documents_company_id_idx" ON "digital_documents"("company_id");

-- CreateIndex
CREATE INDEX "digital_documents_category_code_idx" ON "digital_documents"("category_code");

-- AddForeignKey
ALTER TABLE "digital_documents" ADD CONSTRAINT "digital_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_documents" ADD CONSTRAINT "digital_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
