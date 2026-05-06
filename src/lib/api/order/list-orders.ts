import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const listOrdersSchema = z.object({
  organizationId: z.uuid(),
  referenceDate: z.string().optional(),
});

export type ListOrdersProps = z.infer<typeof listOrdersSchema>;

function parseReferenceDate(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data de referencia invalida.");
  }

  return parsed;
}

const listOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const start = parseReferenceDate(data.referenceDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const items = await prisma.orderItem.findMany({
      where: {
        deliveredAt: { gte: start, lt: end },
        order: { organizationId: data.organizationId },
      },
      orderBy: { deliveredAt: "asc" },
      select: {
        id: true,
        description: true,
        unit_price: true,
        quantity: true,
        deliveredAt: true,
        note: true,
        isDelivered: true,
        order: {
          select: {
            id: true,
            orderedAt: true,
            note: true,
            customer: true,
            isPaid: true,
            shippingFee: true,
            discount: true,
            total: true,
          },
        },
      },
    });

    type RawItem = typeof items[0];
    type OrderGroupItem = Pick<RawItem, "id" | "description" | "quantity" | "note" | "isDelivered"> & { total: number };
    type OrderGroup = {
      key: string;
      deliveredAt: string;
      order: Omit<RawItem["order"], "shippingFee" | "discount" | "total"> & { shippingFee: number | null; discount: number | null; total: number };
      items: OrderGroupItem[];
    };

    const groupMap = new Map<string, OrderGroup>();
    for (const item of items) {
      const key = `${item.order.id}_${item.deliveredAt?.toISOString() ?? "sem-data"}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          deliveredAt: item.deliveredAt?.toISOString() ?? "",
          order: {
            ...item.order,
            shippingFee: item.order.shippingFee !== null ? Number(item.order.shippingFee) : null,
            discount: item.order.discount !== null ? Number(item.order.discount) : null,
            total: Number(item.order.total),
          },
          items: [],
        });
      }
      groupMap.get(key)!.items.push({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        total: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
        note: item.note,
        isDelivered: item.isDelivered,
      });
    }

    const groups = Array.from(groupMap.values());

    return {
      referenceDate: start.toISOString(),
      itemCount: items.length,
      groups,
    };
  });

export async function listOrders(data: ListOrdersProps) {
  return listOrdersServerFn({ data });
}
