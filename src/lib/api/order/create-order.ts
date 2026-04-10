import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Descrição do item e obrigatória."),
  unitPrice: z.number().min(0, "Preço unitário deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade mínima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatória."),
  isDelivered: z.boolean().default(false),
  note: z.string().trim().optional(),
});

export const transactionSchema = z.object({
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  method: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD"]),
  madeAt: z.string().trim().min(1, "Data/hora da transação e obrigatória."),
});

export const createOrderSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
  orderedAt: z.string().trim().min(1, "Data do pedido é obrigatório."),
  isPaid: z.boolean().default(false),
  note: z.string().trim().optional(),
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item."),
  transactions: z.array(transactionSchema),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderOutput = z.output<typeof createOrderSchema>;

function toDateOrThrow(value: string, fieldLabel: string) {
  // datetime-local values have no timezone info — treat as UTC to match the display formatter (timeZone: "UTC")
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + "Z";
  const date = new Date(normalized);

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
        throw new Error("Cliente não encontrado para a organização informada.");
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          organizationId: data.organizationId,
          customerId: data.customerId ?? null,
          orderedAt: toDateOrThrow(data.orderedAt, "Data do pedido"),
          isPaid: data.isPaid,
          note: toOptionalString(data.note),
          shippingFee: data.shippingFee ?? null,
          discount: data.discount ?? null,
          item: {
            create: data.items.map((item) => ({
              description: item.description,
              unit_price: item.unitPrice,
              quantity: item.quantity,
              total: Number((item.unitPrice * item.quantity).toFixed(2)),
              deliveredAt: toDateOrThrow(item.deliveredAt, "Data de entrega do item"),
              isDelivered: item.isDelivered,
              note: toOptionalString(item.note),
            })),
          },
        },
        select: {
          id: true,
        },
      });

      if (data.transactions.length > 0) {
        for (const transaction of data.transactions) {
          const createdTransaction = await tx.transaction.create({
            data: {
              organizationId: data.organizationId,
              description: "Transação para pedido",
              amount: transaction.amount,
              method: transaction.method,
              madeAt: toDateOrThrow(transaction.madeAt, "Data da transação"),
            },
            select: { id: true },
          });

          await tx.orderTransaction.create({
            data: {
              orderId: createdOrder.id,
              transactionId: createdTransaction.id,
            },
          });

          if (data.customerId) {
            await tx.customerTransaction.create({
              data: {
                customerId: data.customerId,
                transactionId: createdTransaction.id,
              },
            });
          }
        }
      }

      return createdOrder;
    });

    return order;
  });

export async function createOrder(data: CreateOrderOutput) {
  return createOrderServerFn({
    data,
  });
}
