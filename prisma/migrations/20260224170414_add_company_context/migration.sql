-- CreateTable
CREATE TABLE "company_contexts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "internal_issues" TEXT,
    "external_issues" TEXT,
    "interested_parties" JSONB,
    "sga_scope" TEXT,
    "scope_inclusions" TEXT,
    "scope_exclusions" TEXT,
    "ohs_policy" TEXT,
    "ohs_policy_date" DATE,
    "ohs_policy_approved_by" TEXT,
    "ohs_policy_doc_path" TEXT,
    "ohs_roles" JSONB,
    "participation_mechanism" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_review_date" DATE,
    "next_review_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_contexts_company_id_key" ON "company_contexts"("company_id");

-- AddForeignKey
ALTER TABLE "company_contexts" ADD CONSTRAINT "company_contexts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
