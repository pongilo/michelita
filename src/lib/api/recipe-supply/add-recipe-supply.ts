import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/prisma";

const addRecipeSupplySchema = z.object({
  recipeId: z.uuid(),
  supplyId: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type AddRecipeSupplyProps = z.infer<typeof addRecipeSupplySchema>;

const addRecipeSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => addRecipeSupplySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const recipeSupply = await prisma.recipeSupply.create({
        data: {
          recipeId: data.recipeId,
          supplyId: data.supplyId,
          quantity: data.quantity,
        },
        select: { id: true },
      });

      return recipeSupply;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Este insumo já está nesta receita.");
      }
      throw error;
    }
  });

export async function addRecipeSupply(data: AddRecipeSupplyProps) {
  return addRecipeSupplyServerFn({ data });
}
