import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getCustomerDetailsSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.uuid(),
});

export type GetCustomerDetailsProps = z.infer<typeof getCustomerDetailsSchema>;

const getCustomerDetailsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getCustomerDetailsSchema.parse(input))
  .handler(async ({ data }) => {
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        note: true,
      },
    });

    if (!customer) {
      throw new Error("Cliente nao encontrado para a organizacao informada.");
    }

    const [orders, transactions] = await Promise.all([
      prisma.order.findMany({
        where: {
          organizationId: data.organizationId,
          customerId: data.customerId,
        },
        orderBy: {
          orderedAt: "desc",
        },
        select: {
          id: true,
          isPaid: true,
          orderedAt: true,
          note: true,
          item: {
            select: {
              id: true,
              description: true,
              quantity: true,
              total: true,
              deliveredAt: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          organizationId: data.organizationId,
          customerId: data.customerId,
        },
        orderBy: {
          madeAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          method: true,
          madeAt: true,
          description: true,
        },
      }),
    ]);

    const orderSummaries = orders.map((order) => {
      const itemTotal = order.item.reduce((sum, item) => sum + Number(item.total), 0);

      return {
        id: order.id,
        isPaid: order.isPaid,
        orderedAt: order.orderedAt,
        note: order.note,
        itemCount: order.item.length,
        itemTotal: Number(itemTotal.toFixed(2)),
      };
    });

    const totalOrders = orderSummaries.length;
    const totalInvoiced = orderSummaries.reduce((sum, order) => sum + order.itemTotal, 0);
    const totalReceived = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const recentTransactions = transactions.slice(0, 20).map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      method: transaction.method,
      madeAt: transaction.madeAt,
      description: transaction.description,
      type: Number(transaction.amount) >= 0 ? "entry" : "exit",
    }));

    return {
      customer,
      metrics: {
        totalOrders,
        totalInvoiced: Number(totalInvoiced.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        balance: Number((totalReceived - totalInvoiced).toFixed(2)),
        lastOrderAt: orderSummaries[0]?.orderedAt ?? null,
      },
      recentOrders: orderSummaries.slice(0, 15),
      recentTransactions,
    };
  });

export async function getCustomerDetails(data: GetCustomerDetailsProps) {
  return getCustomerDetailsServerFn({
    data,
  });
}
