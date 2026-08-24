-- AlterTable
ALTER TABLE "product_category" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "product_category_organization_id_slug_key" ON "product_category"("organization_id", "slug");
