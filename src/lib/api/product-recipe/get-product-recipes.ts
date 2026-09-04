import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductRecipesSchema = z.object({
  productId: z.uuid(),
});

export type GetProductRecipesProps = z.infer<typeof getProductRecipesSchema>;

const getProductRecipesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductRecipesSchema.parse(input))
  .handler(async ({ data }) => {
    const items = await prisma.productRecipe.findMany({
      where: { productId: data.productId },
      orderBy: { recipe: { name: "asc" } },
      select: {
        id: true,
        quantity: true,
        recipe: {
          select: {
            id: true,
            name: true,
            yieldQuantity: true,
            yieldUnit: true,
            supply: {
              orderBy: { supply: { name: "asc" } },
              select: {
                id: true,
                quantity: true,
                supply: { select: { id: true, name: true, unit: true, costPerUnit: true } },
              },
            },
          },
        },
      },
    });

    return {
      items: items.map((item) => {
        const yieldQuantity = Number(item.recipe.yieldQuantity);
        const costTotal = item.recipe.supply.reduce(
          (sum, s) => sum + Number(s.quantity) * Number(s.supply.costPerUnit),
          0,
        );
        const costPerYield = yieldQuantity > 0 ? costTotal / yieldQuantity : null;

        return {
          id: item.id,
          quantity: Number(item.quantity),
          recipe: {
            id: item.recipe.id,
            name: item.recipe.name,
            yieldQuantity,
            yieldUnit: item.recipe.yieldUnit,
            costTotal,
            costPerYield,
            ingredients: item.recipe.supply.map((s) => ({
              id: s.id,
              quantity: Number(s.quantity),
              supply: {
                ...s.supply,
                costPerUnit: Number(s.supply.costPerUnit),
              },
            })),
          },
        };
      }),
    };
  });

export async function getProductRecipes(props: GetProductRecipesProps) {
  return getProductRecipesServerFn({ data: props });
}
