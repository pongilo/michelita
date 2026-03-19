import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getOrderSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type GetOrderProps = z.infer<typeof getOrderSchema>;

const transactionMethodFromPrisma = {
  PIX: "pix",
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
} as const;

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
        isCanceled: true,
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
        transaction: {
          orderBy: {
            madeAt: "asc",
          },
          select: {
            id: true,
            amount: true,
            method: true,
            madeAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const itemTotal = order.item.reduce((sum, item) => sum + Number(item.total), 0);
    const transactionTotal = order.transaction.reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      id: order.id,
      organizationId: order.organizationId,
      customerId: order.customerId,
      isCanceled: order.isCanceled,
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
      transaction: order.transaction.map((entry) => ({
        id: entry.id,
        amount: Number(entry.amount),
        method: transactionMethodFromPrisma[entry.method],
        madeAt: entry.madeAt,
      })),
      itemTotal,
      transactionTotal,
      balance: Number((itemTotal - transactionTotal).toFixed(2)),
    };
  });

export async function getOrder(data: GetOrderProps) {
  return getOrderServerFn({
    data,
  });
}
