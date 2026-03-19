import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createTransactionSchema = z.object({
  organizationId: z.uuid(),
  orderId: z.uuid().optional(),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  type: z.enum(["entry", "exit"]),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data da transacao e obrigatoria."),
  accountId: z.uuid().optional(),
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

    const transaction = await prisma.transaction.create({
      data: {
        organizationId: data.organizationId,
        orderId: data.orderId ?? null,
        amount: normalizedAmount,
        method: transactionMethodToPrisma[data.method],
        madeAt: toDateOrThrow(data.madeAt, "Data da transacao"),
        accountId: data.accountId ?? null,
      },
      select: {
        id: true,
      },
    });

    return transaction;
  });

export async function createTransaction(data: CreateTransactionProps) {
  return createTransactionServerFn({
    data,
  });
}
