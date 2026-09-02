import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteRecipeSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteRecipeProps = z.infer<typeof deleteRecipeSchema>;

const deleteRecipeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteRecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.recipe.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Receita não encontrada para a organização informada.");
    }

    return { id: data.id };
  });

export async function deleteRecipe(data: DeleteRecipeProps) {
  return deleteRecipeServerFn({ data });
}
