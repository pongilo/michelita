import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getOrderSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type GetOrderProps = z.infer<typeof getOrderSchema>;

const getOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const order = await prisma.order.findFirst({
      where: {
        id: data.id,
        organizationId: data.organizationId,
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
            address: true,
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
        orderTransaction: {
          orderBy: {
            transaction: {
              madeAt: "desc",
            },
          },
          select: {
            transaction: {
              select: {
                id: true,
                amount: true,
                method: true,
                madeAt: true,
                description: true,
                customer: {
                  select: {
                    customer: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

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
      transactions: order.orderTransaction.map(({ transaction }) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        type: Number(transaction.amount) >= 0 ? "entry" : "exit",
        method: transaction.method as string,
        madeAt: transaction.madeAt,
        description: transaction.description,
        linkedCustomers: transaction.customer.map((c) => c.customer),
      })),
    };
  });

export async function getOrder(data: GetOrderProps) {
  return getOrderServerFn({
    data,
  });
}
