import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductionOrdersSchema = z.object({
  organizationId: z.uuid(),
  productionDate: z.string().optional(),
});

export type GetProductionOrdersProps = z.infer<typeof getProductionOrdersSchema>;

function parseProductionDate(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data de referencia invalida.");
  }

  return parsed;
}

function getProductionDayBounds(baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
  };
}

export type ProductionOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  deliveredAt: Date;
  isDelivered: boolean;
  note: string | null;
};

export type ProductionOrder = {
  id: string;
  isPaid: boolean;
  orderedAt: Date;
  note: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  items: ProductionOrderItem[];
  itemsTotal: number;
};

export type GetProductionOrdersResult = {
  productionDate: string;
  orders: ProductionOrder[];
};

const getProductionOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductionOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const productionDate = parseProductionDate(data.productionDate);
    const { start, end } = getProductionDayBounds(productionDate);

    const orders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
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
            deliveredAt: true,
            isDelivered: true,
            note: true,
          },
        },
      },
    });

    const productionOrders: ProductionOrder[] = orders
    .map((order) => {
      const itemsTotal = order.item.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);

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
          total: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
          deliveredAt: item.deliveredAt,
          isDelivered: item.isDelivered,
          note: item.note,
        })),
        itemsTotal: Number(itemsTotal.toFixed(2)),
      };
    });

    return {
      productionDate: start.toISOString(),
      orders: productionOrders,
    };
  });

export async function getProductionOrders(data: GetProductionOrdersProps) {
  return getProductionOrdersServerFn({
    data,
  });
}
