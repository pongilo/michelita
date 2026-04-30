import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  customerId: z.uuid().nullable().optional(),
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isPaid: z.boolean(),
  note: z.string().trim().optional(),
  shippingFee: z.number().min(0).nullable().optional(),
  discount: z.number().min(0).nullable().optional(),
});

export type UpdateOrderInfoProps = z.infer<typeof schema>;

function toDateOrThrow(value: string, fieldLabel: string) {
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + "Z";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} invalida.`);
  }
  return date;
}

function toOptionalString(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const updateOrderInfoServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId: data.organizationId },
        select: { id: true },
      });
      if (!customer) {
        throw new Error("Cliente nao encontrado para a organizacao informada.");
      }
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
      select: { id: true, item: { select: { total: true } } },
    });
    if (!existingOrder) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const itemTotal = existingOrder.item.reduce((sum, i) => sum + Number(i.total), 0);
    const orderTotal = Number((itemTotal + (data.shippingFee ?? 0) - (data.discount ?? 0)).toFixed(2));

    await prisma.order.update({
      where: { id: data.id },
      data: {
        customerId: data.customerId ?? null,
        orderedAt: toDateOrThrow(data.orderedAt, "Data do pedido"),
        isPaid: data.isPaid,
        note: toOptionalString(data.note),
        shippingFee: data.shippingFee ?? null,
        discount: data.discount ?? null,
        total: orderTotal,
      },
    });

    return { id: data.id };
  });

export async function updateOrderInfo(data: UpdateOrderInfoProps) {
  return updateOrderInfoServerFn({ data });
}
