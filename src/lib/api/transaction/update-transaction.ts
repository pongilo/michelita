import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateTransactionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  orderId: z.uuid().nullable().optional(),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  type: z.enum(["entry", "exit"]),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data da transacao e obrigatoria."),
  accountId: z.uuid().optional(),
});

export type UpdateTransactionProps = z.infer<typeof updateTransactionSchema>;

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

const updateTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!existingTransaction) {
      throw new Error("Transacao nao encontrada para a organizacao informada.");
    }

    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: data.orderId,
          organizationId: data.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!order) {
        throw new Error("Pedido nao encontrado para a organizacao informada.");
      }
    }

    const normalizedAmount = data.type === "entry" ? data.amount : -Math.abs(data.amount);

    await prisma.transaction.update({
      where: {
        id: data.id,
      },
      data: {
        orderId: data.orderId ?? null,
        amount: normalizedAmount,
        method: transactionMethodToPrisma[data.method],
        madeAt: toDateOrThrow(data.madeAt, "Data da transacao"),
        accountId: data.accountId ?? null,
      },
    });

    return {
      id: data.id,
    };
  });

export async function updateTransaction(data: UpdateTransactionProps) {
  return updateTransactionServerFn({
    data,
  });
}
