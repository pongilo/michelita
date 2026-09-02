import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const removeRecipeSupplySchema = z.object({
  id: z.uuid(),
  recipeId: z.uuid(),
});

export type RemoveRecipeSupplyProps = z.infer<typeof removeRecipeSupplySchema>;

const removeRecipeSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeRecipeSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.recipeSupply.deleteMany({
      where: { id: data.id, recipeId: data.recipeId },
    });

    if (deleted.count === 0) {
      throw new Error("Insumo não encontrado nesta receita.");
    }

    return { id: data.id };
  });

export async function removeRecipeSupply(data: RemoveRecipeSupplyProps) {
  return removeRecipeSupplyServerFn({ data });
}
