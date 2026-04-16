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

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data de referencia invalida.");
  }

  return parsed;
}

const listOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const start = parseReferenceDate(data.referenceDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const items = await prisma.orderItem.findMany({
      where: {
        deliveredAt: { gte: start, lt: end },
        order: { organizationId: data.organizationId },
      },
      orderBy: { deliveredAt: "desc" },
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

    type RawItem = typeof items[0];
    type OrderGroup = {
      key: string;
      deliveredAt: string;
      order: RawItem["order"];
      items: Array<Pick<RawItem, "id" | "description" | "quantity" | "note" | "isDelivered">>;
    };

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
