import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateRecipeSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  yieldQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  yieldUnit: z.string().trim().min(1, "Informe a unidade de medida."),
});

export type UpdateRecipeProps = z.infer<typeof updateRecipeSchema>;

const updateRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const updated = await prisma.recipe.updateMany({
      where: { id: data.id, organizationId: data.organizationId },
      data: {
        name: data.name,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
      },
    });

    if (updated.count === 0) {
      throw new Error("Receita não encontrada para a organização informada.");
    }

    return { id: data.id };
  });

export async function updateRecipe(data: UpdateRecipeProps) {
  return updateRecipeServerFn({ data });
}
