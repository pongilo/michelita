import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const removeProductRecipeSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
});

export type RemoveProductRecipeProps = z.infer<typeof removeProductRecipeSchema>;

const removeProductRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeProductRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.productRecipe.deleteMany({
      where: { id: data.id, productId: data.productId },
    });

    if (deleted.count === 0) {
      throw new Error("Receita não encontrada na ficha técnica do produto.");
    }

    return { id: data.id };
  });

export async function removeProductRecipe(data: RemoveProductRecipeProps) {
  return removeProductRecipeServerFn({ data });
}
