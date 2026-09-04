import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_ORDERS_PAGE_SIZE = 15;

const getCustomerDetailsSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.uuid(),
  limit: z.number().int().min(1).max(100).default(CUSTOMER_ORDERS_PAGE_SIZE),
  offset: z.number().int().min(0).default(0),
});

export type GetCustomerDetailsProps = z.infer<typeof getCustomerDetailsSchema>;

const getCustomerDetailsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getCustomerDetailsSchema.parse(input))
  .handler(async ({ data }) => {
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        note: true,
      },
    });

    if (!customer) {
      throw new Error("Cliente nao encontrado para a organizacao informada.");
    }

    // Metrics are computed across every order the customer has, independent of the page being loaded.
    const allOrders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        customerId: data.customerId,
      },
      select: {
        isPaid: true,
        orderedAt: true,
        item: {
          select: {
            unit_price: true,
            quantity: true,
          },
        },
      },
    });

    const allOrderTotals = allOrders.map((order) => ({
      isPaid: order.isPaid,
      itemTotal: order.item.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0),
    }));

    const totalOrders = allOrderTotals.length;
    const totalInvoiced = allOrderTotals.reduce((sum, order) => sum + order.itemTotal, 0);
    const totalPaid = allOrderTotals.filter((o) => o.isPaid).reduce((sum, order) => sum + order.itemTotal, 0);
    const totalPending = allOrderTotals.filter((o) => !o.isPaid).reduce((sum, order) => sum + order.itemTotal, 0);
    const lastOrderAt = allOrders.reduce<Date | null>((latest, order) => {
      if (!latest || order.orderedAt > latest) return order.orderedAt;
      return latest;
    }, null);

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        customerId: data.customerId,
      },
      orderBy: {
        orderedAt: "desc",
      },
      skip: data.offset,
      take: data.limit,
      select: {
        id: true,
        isPaid: true,
        orderedAt: true,
        note: true,
        item: {
          select: {
            id: true,
            description: true,
            unit_price: true,
            quantity: true,
            deliveredAt: true,
            note: true,
          },
        },
      },
    });

    const orderSummaries = orders.map((order) => {
      const itemTotal = order.item.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);

      return {
        id: order.id,
        isPaid: order.isPaid,
        orderedAt: order.orderedAt,
        note: order.note,
        itemCount: order.item.length,
        itemTotal: Number(itemTotal.toFixed(2)),
        items: order.item.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          total: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
          deliveredAt: item.deliveredAt,
          note: item.note
        })),
      };
    });

    return {
      customer,
      metrics: {
        totalOrders,
        totalInvoiced: Number(totalInvoiced.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        lastOrderAt,
      },
      orders: orderSummaries,
      hasMore: data.offset + orderSummaries.length < totalOrders,
    };
  });

export async function getCustomerDetails(data: GetCustomerDetailsProps) {
  return getCustomerDetailsServerFn({
    data,
  });
}
