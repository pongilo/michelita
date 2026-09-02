import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/prisma";

const addProductRecipeSchema = z.object({
  productId: z.uuid(),
  recipeId: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type AddProductRecipeProps = z.infer<typeof addProductRecipeSchema>;

const addProductRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => addProductRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const productRecipe = await prisma.productRecipe.create({
        data: {
          productId: data.productId,
          recipeId: data.recipeId,
          quantity: data.quantity,
        },
        select: { id: true },
      });

      return productRecipe;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Esta receita já está na ficha técnica do produto.");
      }
      throw error;
    }
  });

export async function addProductRecipe(data: AddProductRecipeProps) {
  return addProductRecipeServerFn({ data });
}
