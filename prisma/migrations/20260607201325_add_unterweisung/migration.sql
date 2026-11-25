-- CreateTable
CREATE TABLE "unterweisungen" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "abteilung" TEXT,
    "ort" TEXT,
    "datum" DATE NOT NULL,
    "zeit_von" TEXT,
    "zeit_bis" TEXT,
    "anlass" TEXT[],
    "inhalt" TEXT NOT NULL,
    "naechster_termin" TEXT,
    "teilnehmer_anzahl" INTEGER DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'entwurf',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unterweisungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unterweisungen_company_id_idx" ON "unterweisungen"("company_id");

-- AddForeignKey
ALTER TABLE "unterweisungen" ADD CONSTRAINT "unterweisungen_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unterweisungen" ADD CONSTRAINT "unterweisungen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
