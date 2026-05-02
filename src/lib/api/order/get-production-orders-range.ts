import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ProductionOrder, ProductionOrderItem } from "./get-production-orders";

const schema = z.object({
  organizationId: z.uuid(),
  startDate: z.string(),
  endDate: z.string(),
});

export type GetProductionOrdersRangeProps = z.infer<typeof schema>;

export type FlatProductionItem = ProductionOrderItem & {
  order: Pick<ProductionOrder, "id" | "isPaid" | "orderedAt" | "note" | "customer">;
};

const getProductionOrdersRangeServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const start = new Date(`${data.startDate}T00:00:00`);
    const end = new Date(`${data.endDate}T00:00:00`);

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        item: {
          some: {
            deliveredAt: { gte: start, lt: end },
          },
        },
      },
      orderBy: { orderedAt: "asc" },
      select: {
        id: true,
        isPaid: true,
        orderedAt: true,
        note: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        item: {
          where: { deliveredAt: { gte: start, lt: end } },
          orderBy: { deliveredAt: "asc" },
          select: {
            id: true,
            description: true,
            quantity: true,
            unit_price: true,
            deliveredAt: true,
            isDelivered: true,
            note: true,
          },
        },
      },
    });

    const flatItems: FlatProductionItem[] = orders
      .flatMap((order) =>
        order.item.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
          deliveredAt: item.deliveredAt,
          isDelivered: item.isDelivered,
          note: item.note,
          order: {
            id: order.id,
            isPaid: order.isPaid,
            orderedAt: order.orderedAt,
            note: order.note,
            customer: order.customer,
          },
        }))
      )
      .sort((a, b) => new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime());

    return { items: flatItems };
  });

export async function getProductionOrdersRange(data: GetProductionOrdersRangeProps) {
  return getProductionOrdersRangeServerFn({ data });
}
