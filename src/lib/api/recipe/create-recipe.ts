import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createRecipeSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  yieldQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  yieldUnit: z.string().trim().min(1, "Informe a unidade de medida."),
});

export type CreateRecipeProps = z.infer<typeof createRecipeSchema>;

const createRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const recipe = await prisma.recipe.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
      },
      select: { id: true, name: true, yieldQuantity: true, yieldUnit: true, updatedAt: true },
    });

    return {
      ...recipe,
      yieldQuantity: Number(recipe.yieldQuantity),
    };
  });

export async function createRecipe(data: CreateRecipeProps) {
  return createRecipeServerFn({ data });
}
