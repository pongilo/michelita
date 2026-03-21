import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateTransactionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  linkedCustomerId: z.uuid().nullable().optional(),
  linkedOrderId: z.uuid().nullable().optional(),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  type: z.enum(["entry", "exit"]),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data da transacao e obrigatoria."),
  description: z.string().trim().max(500, "A descricao deve ter no maximo 500 caracteres.").optional(),
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

    let orderCustomerId: string | null = null;
    if (data.linkedOrderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: data.linkedOrderId,
          organizationId: data.organizationId,
        },
        select: {
          id: true,
          customerId: true,
        },
      });

      if (!order) {
        throw new Error("Pedido nao encontrado para a organizacao informada.");
      }

      orderCustomerId = order.customerId;
    }

    const normalizedAmount = data.type === "entry" ? data.amount : -Math.abs(data.amount);

    await prisma.$transaction(async (transactionClient) => {
      await transactionClient.transaction.update({
        where: {
          id: data.id,
        },
        data: {
          amount: normalizedAmount,
          method: transactionMethodToPrisma[data.method],
          madeAt: toDateOrThrow(data.madeAt, "Data da transacao"),
          description: data.description || null,
        },
      });

      await transactionClient.customerTransaction.deleteMany({
        where: {
          transactionId: data.id,
        },
      });

      await transactionClient.orderTransaction.deleteMany({
        where: {
          transactionId: data.id,
        },
      });

      if (data.linkedCustomerId) {
        await transactionClient.customerTransaction.create({
          data: {
            customerId: data.linkedCustomerId,
            transactionId: data.id,
          },
        });
      }

      if (data.linkedOrderId) {
        await transactionClient.orderTransaction.create({
          data: {
            orderId: data.linkedOrderId,
            transactionId: data.id,
          },
        });

        if (orderCustomerId && orderCustomerId !== data.linkedCustomerId) {
          await transactionClient.customerTransaction.create({
            data: {
              customerId: orderCustomerId,
              transactionId: data.id,
            },
          });
        }
      }
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
