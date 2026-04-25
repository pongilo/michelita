import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateTransactionCategorySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome."),
});

export type UpdateTransactionCategoryProps = z.infer<typeof updateTransactionCategorySchema>;

const updateTransactionCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateTransactionCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const updated = await prisma.transactionCategory.updateMany({
      where: { id: data.id, organizationId: data.organizationId },
      data: { name: data.name },
    });

    if (updated.count === 0) {
      throw new Error("Categoria não encontrada.");
    }

    return { id: data.id, name: data.name };
  });

export async function updateTransactionCategory(data: UpdateTransactionCategoryProps) {
  return updateTransactionCategoryServerFn({ data });
}
