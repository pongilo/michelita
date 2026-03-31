import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const dashboardPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
// const deliverySchema = z.enum(["all", "pending", "delivered"]);

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

    const ordersItemByPeriod = await prisma.orderItem.findMany({
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
          deliveredAt: "desc",
        },
        select: {
          id: true,
          description: true,
          quantity: true,
          deliveredAt: true,
          note: true,
          isDelivered: true,
          order: {
            select: {
              id: true,
              orderedAt: true,
              customer: true,
              isPaid: true,
            },
          },
        },
      });

    const itemsByDateMap = ordersItemByPeriod.reduce<
      Record<string, typeof ordersItemByPeriod>
    >((acc, item) => {
      const date = item.deliveredAt
        ? new Date(item.deliveredAt).toISOString().slice(0, 10)
        : "sem-data";
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});

    const orderItemByDay: { date: string; items: typeof ordersItemByPeriod }[] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const date = cursor.toISOString().slice(0, 10);
      orderItemByDay.push({ date, items: itemsByDateMap[date] ?? [] });
      cursor.setDate(cursor.getDate() + 1);
    }
    orderItemByDay.reverse();

    return {
      period: data.period,
      referenceDate: start.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      itemsByDay: orderItemByDay,
    };
  });

export async function getDailyDashboard(data: GetDailyDashboardProps) {
  return getDailyDashboardServerFn({
    data,
  });
}
