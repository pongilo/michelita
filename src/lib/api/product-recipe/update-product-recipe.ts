import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateProductRecipeSchema = z.object({
  id: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type UpdateProductRecipeProps = z.infer<typeof updateProductRecipeSchema>;

const updateProductRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const productRecipe = await prisma.productRecipe.update({
      where: { id: data.id },
      data: { quantity: data.quantity },
      select: { id: true },
    });

    return productRecipe;
  });

export async function updateProductRecipe(data: UpdateProductRecipeProps) {
  return updateProductRecipeServerFn({ data });
}
