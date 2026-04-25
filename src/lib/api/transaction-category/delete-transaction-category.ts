import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteTransactionCategorySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteTransactionCategoryProps = z.infer<typeof deleteTransactionCategorySchema>;

const deleteTransactionCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteTransactionCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.transactionCategory.deleteMany({
      where: { id: data.id, organizationId: data.organizationId },
    });

    if (deleted.count === 0) {
      throw new Error("Categoria não encontrada.");
    }

    return { id: data.id };
  });

export async function deleteTransactionCategory(data: DeleteTransactionCategoryProps) {
  return deleteTransactionCategoryServerFn({ data });
}
