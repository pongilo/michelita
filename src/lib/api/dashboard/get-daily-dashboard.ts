import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const dashboardPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

const getDailyDashboardSchema = z.object({
  organizationId: z.uuid(),
  period: dashboardPeriodSchema.default("daily"),
  referenceDate: z.string().optional(),
});

export type GetDailyDashboardProps = z.infer<typeof getDailyDashboardSchema>;
type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

function getPeriodBounds(period: DashboardPeriod, baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === "daily") {
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
    };
  }

  if (period === "weekly") {
    const weekDay = start.getDay();
    const diffToMonday = (weekDay + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);

    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);

    return {
      start,
      end,
    };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);

  return {
    start,
    end,
  };
}

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

const getDailyDashboardServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getDailyDashboardSchema.parse(input))
  .handler(async ({ data }) => {
    const referenceDate = parseReferenceDate(data.referenceDate);
    const { start, end } = getPeriodBounds(data.period, referenceDate);
    const rangeEnd = new Date(end.getTime() - 1);

    const [ordersToday, transactionsToday, deliveriesToday] = await Promise.all([
      prisma.order.findMany({
        where: {
          organizationId: data.organizationId,
          orderedAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          orderedAt: "desc",
        },
        select: {
          id: true,
          isPaid: true,
          orderedAt: true,
          note: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          item: {
            select: {
              total: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          organizationId: data.organizationId,
          madeAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          amount: true,
          method: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          deliveredAt: {
            gte: start,
            lt: end,
          },
          order: {
            organizationId: data.organizationId,
          },
        },
        orderBy: {
          deliveredAt: "asc",
        },
        take: 8,
        select: {
          id: true,
          description: true,
          quantity: true,
          deliveredAt: true,
          order: {
            select: {
              id: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalOrders = ordersToday.length;
    const grossRevenue = ordersToday.reduce((sum, order) => {
      const orderTotal = order.item.reduce((itemSum, item) => itemSum + Number(item.total), 0);
      return sum + orderTotal;
    }, 0);

    const { entry, exit } = transactionsToday.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      if (amount > 0) {
        acc.entry = acc.entry + amount
      } 
      if (amount < 0) {
        acc.exit = acc.exit - amount
      }
      return acc
    }, {
      entry: 0,
      exit: 0
    });

    const averageTicket = totalOrders > 0 ? grossRevenue / totalOrders : 0;

    const byMethod = transactionsToday.reduce(
      (acc, transaction) => {
        const value = Number(transaction.amount);

        if (value < 0) {
          return acc;
        }

        if (transaction.method === "PIX") {
          acc.pix += value;
        } else if (transaction.method === "CASH") {
          acc.cash += value;
        } else if (transaction.method === "CREDIT_CARD") {
          acc.creditCard += value;
        } else if (transaction.method === "DEBIT_CARD") {
          acc.debitCard += value;
        }

        return acc;
      },
      {
        pix: 0,
        cash: 0,
        creditCard: 0,
        debitCard: 0,
      }
    );

    return {
      period: data.period,
      referenceDate: start.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      metrics: {
        totalOrders,
        grossRevenue: Number(grossRevenue.toFixed(2)),
        entry: Number(entry.toFixed(2)),
        exit: Number(exit.toFixed(2)),
        balance: Number((entry - exit).toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
      },
      byMethod: {
        pix: Number(byMethod.pix.toFixed(2)),
        cash: Number(byMethod.cash.toFixed(2)),
        creditCard: Number(byMethod.creditCard.toFixed(2)),
        debitCard: Number(byMethod.debitCard.toFixed(2)),
      },
      upcomingDeliveries: deliveriesToday
        .map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          deliveredAt: item.deliveredAt,
          orderId: item.order.id,
          customerName: item.order.customer?.name ?? null,
        })),
      recentOrders: ordersToday.slice(0, 6).map((order) => ({
        id: order.id,
        orderedAt: order.orderedAt,
        isPaid: order.isPaid,
        note: order.note,
        customerName: order.customer?.name ?? null,
        customerId: order.customer?.id ?? null,
      })),
    };
  });

export async function getDailyDashboard(data: GetDailyDashboardProps) {
  return getDailyDashboardServerFn({
    data,
  });
}
