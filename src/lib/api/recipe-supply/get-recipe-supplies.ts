import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getRecipeSuppliesSchema = z.object({
  recipeId: z.uuid(),
});

export type GetRecipeSuppliesProps = z.infer<typeof getRecipeSuppliesSchema>;

const getRecipeSuppliesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getRecipeSuppliesSchema.parse(input))
  .handler(async ({ data }) => {
    const items = await prisma.recipeSupply.findMany({
      where: { recipeId: data.recipeId },
      orderBy: { supply: { name: "asc" } },
      select: {
        id: true,
        quantity: true,
        supply: {
          select: { id: true, name: true, unit: true, costPerUnit: true },
        },
      },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        quantity: Number(item.quantity),
        supply: {
          ...item.supply,
          costPerUnit: Number(item.supply.costPerUnit),
        },
      })),
    };
  });

export async function getRecipeSupplies(props: GetRecipeSuppliesProps) {
  return getRecipeSuppliesServerFn({ data: props });
}
