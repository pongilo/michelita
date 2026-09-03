import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getRecipesSchema = z.object({
  organizationId: z.uuid(),
});

export type GetRecipesProps = z.infer<typeof getRecipesSchema>;

const getRecipesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getRecipesSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId } = data;

    const recipes = await prisma.recipe.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        yieldQuantity: true,
        yieldUnit: true,
        updatedAt: true,
        supply: {
          orderBy: { supply: { name: "asc" } },
          select: {
            id: true,
            quantity: true,
            supply: { select: { id: true, name: true, unit: true, costPerUnit: true } },
          },
        },
        _count: { select: { product: true } },
      },
    });

    return {
      recipes: recipes.map((recipe) => {
        const yieldQuantity = Number(recipe.yieldQuantity);
        const costTotal = recipe.supply.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.supply.costPerUnit),
          0,
        );
        const costPerYield = yieldQuantity > 0 ? costTotal / yieldQuantity : null;

        return {
          id: recipe.id,
          name: recipe.name,
          yieldQuantity,
          yieldUnit: recipe.yieldUnit,
          updatedAt: recipe.updatedAt,
          costTotal,
          costPerYield,
          _count: recipe._count,
          ingredients: recipe.supply.map((item) => ({
            id: item.id,
            quantity: Number(item.quantity),
            supply: {
              ...item.supply,
              costPerUnit: Number(item.supply.costPerUnit),
            },
          })),
        };
      }),
    };
  });

export async function getRecipes(props: GetRecipesProps) {
  return getRecipesServerFn({ data: props });
}
