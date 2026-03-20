import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ordersPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

const getOrdersSchema = z.object({
  organizationId: z.uuid(),
  period: ordersPeriodSchema.default("daily"),
  referenceDate: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isPaid: z.boolean().optional(),
});

export type GetOrdersProps = z.infer<typeof getOrdersSchema>;
type OrdersPeriod = z.infer<typeof ordersPeriodSchema>;

function toDateOrThrow(value: string, fieldLabel: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  return date;
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

function getPeriodBounds(period: OrdersPeriod, baseDate: Date) {
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

const getOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const periodBounds = getPeriodBounds(data.period, parseReferenceDate(data.referenceDate));
    const orderedAtFilter =
      data.dateFrom || data.dateTo
        ? {
            ...(data.dateFrom ? { gte: toDateOrThrow(data.dateFrom, "Data inicial") } : {}),
            ...(data.dateTo ? { lte: toDateOrThrow(data.dateTo, "Data final") } : {}),
          }
        : {
            gte: periodBounds.start,
            lt: periodBounds.end,
          };

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        orderedAt: orderedAtFilter,
        ...(data.isPaid !== undefined ? { isPaid: data.isPaid } : {}),
      },
      orderBy: {
        orderedAt: "desc",
      },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
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
