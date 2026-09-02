import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateRecipeSupplySchema = z.object({
  id: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type UpdateRecipeSupplyProps = z.infer<typeof updateRecipeSupplySchema>;

const updateRecipeSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateRecipeSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const recipeSupply = await prisma.recipeSupply.update({
      where: { id: data.id },
      data: { quantity: data.quantity },
      select: { id: true },
    });

    return recipeSupply;
  });

export async function updateRecipeSupply(data: UpdateRecipeSupplyProps) {
  return updateRecipeSupplyServerFn({ data });
}
