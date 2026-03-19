import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getDailyOrdersSchema = z.object({
  organizationId: z.uuid(),
  referenceDate: z.string().optional(),
});

export type GetDailyOrdersProps = z.infer<typeof getDailyOrdersSchema>;

function parseReferenceDate(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data de referencia invalida.");
  }

  return parsed;
}

function getDayBounds(baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
  };
}

const getDailyOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getDailyOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const referenceDate = parseReferenceDate(data.referenceDate);
    const { start, end } = getDayBounds(referenceDate);

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        isCanceled: false,
        item: {
          some: {
            deliveredAt: {
              gte: start,
              lt: end,
            },
          },
        },
      },
      orderBy: {
        orderedAt: "asc",
      },
      select: {
        id: true,
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
          where: {
            deliveredAt: {
              gte: start,
              lt: end,
            },
          },
          orderBy: {
            deliveredAt: "asc",
          },
          select: {
            id: true,
            description: true,
            quantity: true,
            unit_price: true,
            total: true,
            deliveredAt: true,
            note: true,
          },
        },
        transaction: {
          select: {
            amount: true,
          },
        },
      },
    });

    const orderRows = orders.map((order) => {
      const itemsTotal = order.item.reduce((sum, item) => sum + Number(item.total), 0);
      const transactionsTotal = order.transaction.reduce((sum, entry) => sum + Number(entry.amount), 0);

      return {
        id: order.id,
        isPaid: order.isPaid,
        orderedAt: order.orderedAt,
        note: order.note,
        customer: order.customer,
        items: order.item.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total),
          deliveredAt: item.deliveredAt,
          note: item.note,
        })),
        itemsTotal: Number(itemsTotal.toFixed(2)),
        transactionsTotal: Number(transactionsTotal.toFixed(2)),
        balance: Number((itemsTotal - transactionsTotal).toFixed(2)),
      };
    });

    const totalOrders = orderRows.length;
    const totalItems = orderRows.reduce(
      (sum, order) => sum + order.items.reduce((itemsSum, item) => itemsSum + item.quantity, 0),
      0
    );
    const totalAmount = orderRows.reduce((sum, order) => sum + order.itemsTotal, 0);
    const receivedAmount = orderRows.reduce((sum, order) => sum + order.transactionsTotal, 0);

    return {
      referenceDate: start.toISOString(),
      metrics: {
        totalOrders,
        totalItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        receivedAmount: Number(receivedAmount.toFixed(2)),
        openAmount: Number(Math.max(totalAmount - receivedAmount, 0).toFixed(2)),
      },
      orders: orderRows,
    };
  });

export async function getDailyOrders(data: GetDailyOrdersProps) {
  return getDailyOrdersServerFn({
    data,
  });
}
