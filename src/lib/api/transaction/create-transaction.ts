import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createTransactionSchema = z.object({
  organizationId: z.uuid(),
  categoryId: z.uuid().nullable().optional(),
  description: z.string().trim().min(2, "Informe ao menos 2 caracteres para a descrição."),
  amount: z.number({ error: "Informe um valor válido." }),
  type: z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
  date: z.string().min(1, "Informe uma data."),
});

export type CreateTransactionProps = z.infer<typeof createTransactionSchema>;

const createTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    const transaction = await prisma.transaction.create({
      data: {
        organizationId: data.organizationId,
        categoryId: data.categoryId ?? null,
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: new Date(/Z|[+-]\d{2}:?\d{2}$/.test(data.date) ? data.date : data.date + "Z"),
      },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        category: { select: { id: true, name: true } },
      },
    });

    return {
      ...transaction,
      amount: Number(transaction.amount),
      date: transaction.date.toISOString(),
    };
  });

export async function createTransaction(data: CreateTransactionProps) {
  return createTransactionServerFn({ data });
}
