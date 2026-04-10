import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ordersPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

const listOrdersSchema = z.object({
  organizationId: z.uuid(),
  period: ordersPeriodSchema.default("daily"),
  referenceDate: z.string().optional(),
});

export type ListOrdersProps = z.infer<typeof listOrdersSchema>;
type OrdersPeriod = z.infer<typeof ordersPeriodSchema>;

function getPeriodBounds(period: OrdersPeriod, baseDate = new Date()) {
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

const listOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listOrdersSchema.parse(input))
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

    type RawItem = typeof ordersItemByPeriod[0];
    type OrderGroup = {
      key: string;
      deliveredAt: string;
      order: RawItem["order"];
      items: Array<Pick<RawItem, "id" | "description" | "quantity" | "note" | "isDelivered">>;
    };

    function groupItemsByOrder(items: RawItem[]): OrderGroup[] {
      const groupMap = new Map<string, OrderGroup>();
      for (const item of items) {
        const key = `${item.order.id}_${item.deliveredAt?.toISOString() ?? "sem-data"}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            key,
            deliveredAt: item.deliveredAt?.toISOString() ?? "",
            order: item.order,
            items: [],
          });
        }
        groupMap.get(key)!.items.push({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          note: item.note,
          isDelivered: item.isDelivered,
        });
      }
      return Array.from(groupMap.values());
    }

    const itemsByDateMap = ordersItemByPeriod.reduce<Record<string, RawItem[]>>(
      (acc, item) => {
        const date = item.deliveredAt
          ? new Date(item.deliveredAt).toISOString().slice(0, 10)
          : "sem-data";
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
      },
      {}
    );

    const orderItemByDay: { date: string; itemCount: number; groups: OrderGroup[] }[] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const date = cursor.toISOString().slice(0, 10);
      const items = itemsByDateMap[date] ?? [];
      orderItemByDay.push({ date, itemCount: items.length, groups: groupItemsByOrder(items) });
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

export async function listOrders(data: ListOrdersProps) {
  return listOrdersServerFn({
    data,
  });
}
