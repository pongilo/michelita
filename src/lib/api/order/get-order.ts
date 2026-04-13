import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getOrderSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type GetOrderProps = z.infer<typeof getOrderSchema>;

const getOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const order = await prisma.order.findFirst({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        isPaid: true,
        orderedAt: true,
        note: true,
        shippingFee: true,
        discount: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            note: true,
          },
        },
        item: {
          orderBy: {
            deliveredAt: "asc",
          },
          select: {
            id: true,
            description: true,
            unit_price: true,
            quantity: true,
            total: true,
            deliveredAt: true,
            isDelivered: true,
            note: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const itemTotal = order.item.reduce((sum, item) => sum + Number(item.total), 0);
    const shippingFee = Number(order.shippingFee ?? 0);
    const discount = Number(order.discount ?? 0);
    const total = itemTotal + shippingFee - discount;

    return {
      id: order.id,
      organizationId: order.organizationId,
      customerId: order.customerId,
      isPaid: order.isPaid,
      orderedAt: order.orderedAt,
      note: order.note,
      shippingFee: shippingFee || null,
      discount: discount || null,
      customer: order.customer,
      item: order.item.map((item) => ({
        id: item.id,
        description: item.description,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        total: Number(item.total),
        deliveredAt: item.deliveredAt,
        isDelivered: item.isDelivered,
        note: item.note,
      })),
      itemTotal,
      total,
    };
  });

export async function getOrder(data: GetOrderProps) {
  return getOrderServerFn({
    data,
  });
}
