import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getOrdersSchema = z.object({
  organizationId: z.uuid(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type GetOrdersProps = z.infer<typeof getOrdersSchema>;

function toDateOrThrow(value: string, fieldLabel: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  return date;
}

const getOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const orderedAtFilter =
      data.dateFrom || data.dateTo
        ? {
            ...(data.dateFrom ? { gte: toDateOrThrow(data.dateFrom, "Data inicial") } : {}),
            ...(data.dateTo ? { lte: toDateOrThrow(data.dateTo, "Data final") } : {}),
          }
        : undefined;

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        ...(orderedAtFilter ? { orderedAt: orderedAtFilter } : {}),
      },
      orderBy: {
        orderedAt: "desc",
      },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        isCanceled: true,
        isPaid: true,
        orderedAt: true,
        note: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
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
            note: true,
          },
        },
      },
    });

    return orders.map((order) => {
      const itemTotal = order.item.reduce((sum, item) => sum + Number(item.total), 0);

      return {
        id: order.id,
        organizationId: order.organizationId,
        customerId: order.customerId,
        isCanceled: order.isCanceled,
        isPaid: order.isPaid,
        orderedAt: order.orderedAt,
        note: order.note,
        customer: order.customer,
        item: order.item.map((item) => ({
          id: item.id,
          description: item.description,
          unitPrice: Number(item.unit_price),
          quantity: item.quantity,
          total: Number(item.total),
          deliveredAt: item.deliveredAt,
          note: item.note,
        })),
        itemTotal,
      };
    });
  });

export async function getOrders(data: GetOrdersProps) {
  return getOrdersServerFn({
    data,
  });
}
