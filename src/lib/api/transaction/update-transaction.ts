import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateTransactionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  categoryId: z.uuid().nullable().optional(),
  description: z.string().trim().min(2, "Informe ao menos 2 caracteres para a descrição."),
  amount: z.number({ error: "Informe um valor válido." }),
  type: z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
  date: z.string().min(1, "Informe uma data."),
});

export type UpdateTransactionProps = z.infer<typeof updateTransactionSchema>;

const updateTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    const updated = await prisma.transaction.updateMany({
      where: { id: data.id, organizationId: data.organizationId },
      data: {
        categoryId: data.categoryId ?? null,
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: new Date(/Z|[+-]\d{2}:?\d{2}$/.test(data.date) ? data.date : data.date + "Z"),
      },
    });

    if (updated.count === 0) {
      throw new Error("Transação não encontrada.");
    }

    return { id: data.id };
  });

export async function updateTransaction(data: UpdateTransactionProps) {
  return updateTransactionServerFn({ data });
}
