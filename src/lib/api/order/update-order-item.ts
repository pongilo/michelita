import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderItemId: z.uuid(),
  organizationId: z.uuid(),
  description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
  unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade minima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega e obrigatoria."),
  isDelivered: z.boolean(),
  note: z.string().trim().optional(),
});

export type UpdateOrderItemProps = z.infer<typeof schema>;

function toDateOrThrow(value: string) {
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + "Z";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error("Data de entrega invalida.");
  return date;
}

const updateOrderItemServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const item = await prisma.orderItem.findFirst({
      where: { id: data.orderItemId, order: { organizationId: data.organizationId } },
      select: { id: true },
    });

    if (!item) throw new Error("Item nao encontrado.");

    const total = Number((data.unitPrice * data.quantity).toFixed(2));

    await prisma.orderItem.update({
      where: { id: data.orderItemId },
      data: {
        description: data.description,
        unit_price: data.unitPrice,
        quantity: data.quantity,
        total,
        deliveredAt: toDateOrThrow(data.deliveredAt),
        isDelivered: data.isDelivered,
        note: data.note?.trim() || null,
      },
    });

    return { id: data.orderItemId };
  });

export async function updateOrderItem(data: UpdateOrderItemProps) {
  return updateOrderItemServerFn({ data });
}
