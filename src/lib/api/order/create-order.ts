import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
  unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade minima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
  note: z.string().trim().optional(),
});

const transactionSchema = z.object({
  amount: z.number().min(0.01, "Valor da transacao deve ser maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data da transacao e obrigatoria."),
});

export const createOrderSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.uuid().nullable().optional(),
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isPaid: z.boolean().default(false),
  note: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item."),
  transactions: z.array(transactionSchema).default([]),
});

export type CreateOrderProps = z.infer<typeof createOrderSchema>;

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

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
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

    const order = await prisma.order.create({
      data: {
        organizationId: data.organizationId,
        customerId: data.customerId ?? null,
        orderedAt: toDateOrThrow(data.orderedAt, "Data do pedido"),
        isCanceled: false,
        isPaid: data.isPaid,
        note: toOptionalString(data.note),
        item: {
          create: data.items.map((item) => ({
            description: item.description,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            total: Number((item.unitPrice * item.quantity).toFixed(2)),
            deliveredAt: toDateOrThrow(item.deliveredAt, "Data de entrega do item"),
            note: toOptionalString(item.note),
          })),
        },
        transaction: data.transactions.length
          ? {
              create: data.transactions.map((transaction) => ({
                organizationId: data.organizationId,
                amount: transaction.amount,
                method: transactionMethodToPrisma[transaction.method],
                madeAt: toDateOrThrow(transaction.madeAt, "Data da transacao"),
              })),
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    return order;
  });

export async function createOrder(data: CreateOrderProps) {
  return createOrderServerFn({
    data,
  });
}
