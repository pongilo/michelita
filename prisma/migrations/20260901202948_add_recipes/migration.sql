-- CreateTable
CREATE TABLE "recipe" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "yield_quantity" DECIMAL(10,3) NOT NULL,
    "yield_unit" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_supply" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "recipe_supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipe" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "product_recipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_supply_recipe_id_supply_id_key" ON "recipe_supply"("recipe_id", "supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipe_product_id_recipe_id_key" ON "product_recipe"("product_id", "recipe_id");

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_supply" ADD CONSTRAINT "recipe_supply_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_supply" ADD CONSTRAINT "recipe_supply_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe" ADD CONSTRAINT "product_recipe_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe" ADD CONSTRAINT "product_recipe_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
