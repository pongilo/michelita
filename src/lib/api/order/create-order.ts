import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Descrição do item e obrigatória."),
  unitPrice: z.number().min(0, "Preço unitário deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade mínima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatória."),
  isDelivered: z.boolean().default(true),
  note: z.string().trim().optional(),
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


    const itemTotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const orderTotal = Number((itemTotal + (data.shippingFee ?? 0) - (data.discount ?? 0)).toFixed(2));

    const order = await prisma.order.create({
      data: {
        organizationId: data.organizationId,
        customerId: data.customerId ?? null,
        orderedAt: toDateOrThrow(data.orderedAt, "Data do pedido"),
        isPaid: data.isPaid,
        note: toOptionalString(data.note),
        shippingFee: data.shippingFee ?? null,
        discount: data.discount ?? null,
        total: orderTotal,
        item: {
          create: data.items.map((item) => ({
            description: item.description,
            unit_price: item.unitPrice,
            quantity: item.quantity,
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

    return order;
  });

export async function createOrder(data: CreateOrderOutput) {
  return createOrderServerFn({
    data,
  });
}
