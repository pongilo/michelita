-- RenameTable
ALTER TABLE "ingredient" RENAME TO "supply";
ALTER TABLE "product_ingredient" RENAME TO "product_supply";

-- RenameColumn
ALTER TABLE "product_supply" RENAME COLUMN "ingredient_id" TO "supply_id";

-- RenameConstraint
ALTER TABLE "supply" RENAME CONSTRAINT "ingredient_pkey" TO "supply_pkey";
ALTER TABLE "product_supply" RENAME CONSTRAINT "product_ingredient_pkey" TO "product_supply_pkey";
ALTER TABLE "supply" RENAME CONSTRAINT "ingredient_organization_id_fkey" TO "supply_organization_id_fkey";
ALTER TABLE "product_supply" RENAME CONSTRAINT "product_ingredient_product_id_fkey" TO "product_supply_product_id_fkey";
ALTER TABLE "product_supply" RENAME CONSTRAINT "product_ingredient_ingredient_id_fkey" TO "product_supply_supply_id_fkey";

-- RenameIndex
ALTER INDEX "product_ingredient_product_id_ingredient_id_key" RENAME TO "product_supply_product_id_supply_id_key";
