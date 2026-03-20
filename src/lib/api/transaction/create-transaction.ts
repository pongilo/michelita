import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createTransactionSchema = z.object({
  organizationId: z.uuid(),
  linkedCustomerId: z.uuid().optional(),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  type: z.enum(["entry", "exit"]),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data da transacao e obrigatoria."),
  description: z.string().trim().max(500, "A descricao deve ter no maximo 500 caracteres.").optional(),
});

export type CreateTransactionProps = z.infer<typeof createTransactionSchema>;

const transactionMethodToPrisma = {
  pix: "PIX",
  cash: "CASH",
  credit_card: "CREDIT_CARD",
  debit_card: "DEBIT_CARD",
} as const;

function toDateOrThrow(value: string, fieldLabel: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  return date;
}

const createTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.linkedCustomerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.linkedCustomerId,
          organizationId: data.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!customer) {
        throw new Error("Cliente nao encontrado para a organizacao informada.");
      }
    }

    const normalizedAmount = data.type === "entry" ? data.amount : -Math.abs(data.amount);

    const transaction = await prisma.$transaction(async (transactionClient) => {
      const createdTransaction = await transactionClient.transaction.create({
        data: {
          organizationId: data.organizationId,
          amount: normalizedAmount,
          method: transactionMethodToPrisma[data.method],
          madeAt: toDateOrThrow(data.madeAt, "Data da transacao"),
          description: data.description || null,
        },
        select: {
          id: true,
        },
      });

      if (data.linkedCustomerId) {
        await transactionClient.customerTransaction.create({
          data: {
            customerId: data.linkedCustomerId,
            transactionId: createdTransaction.id,
          },
        });
      }

      return createdTransaction;
    });

    return transaction;
  });

export async function createTransaction(data: CreateTransactionProps) {
  return createTransactionServerFn({
    data,
  });
}
