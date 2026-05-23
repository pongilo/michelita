import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
  unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade minima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
  isDelivered: z.boolean().optional(),
  note: z.string().trim().optional(),
});

const schema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item."),
});

export type UpdateOrderItemsProps = z.infer<typeof schema>;

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

const updateOrderItemsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const existingOrder = await prisma.order.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
      select: { id: true, shippingFee: true, discount: true },
    });

    if (!existingOrder) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const itemTotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const orderTotal = Number((itemTotal + Number(existingOrder.shippingFee ?? 0) - Number(existingOrder.discount ?? 0)).toFixed(2));

    await prisma.$transaction(async (transaction) => {
      await transaction.orderItem.deleteMany({ where: { orderId: data.id } });

      await transaction.orderItem.createMany({
        data: data.items.map((item) => ({
          orderId: data.id,
          description: item.description,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          deliveredAt: toDateOrThrow(item.deliveredAt, "Data de entrega do item"),
          isDelivered: item.isDelivered ?? false,
          note: toOptionalString(item.note),
        })),
      });

      await transaction.order.update({
        where: { id: data.id },
        data: { total: orderTotal },
      });
    });

    return { id: data.id };
  });

export async function updateOrderItems(data: UpdateOrderItemsProps) {
  return updateOrderItemsServerFn({ data });
}
