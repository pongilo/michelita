import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const linkOrderTransactionSchema = z.object({
  organizationId: z.uuid(),
  orderId: z.uuid(),
  transactionId: z.uuid(),
});

export type LinkOrderTransactionProps = z.infer<typeof linkOrderTransactionSchema>;

const linkOrderTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => linkOrderTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!order) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: data.transactionId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!transaction) {
      throw new Error("Transacao nao encontrada para a organizacao informada.");
    }

    await prisma.$transaction(async (tx) => {
      const alreadyLinked = await tx.orderTransaction.findFirst({
        where: {
          orderId: data.orderId,
          transactionId: data.transactionId,
        },
      });

      if (!alreadyLinked) {
        await tx.orderTransaction.create({
          data: {
            orderId: data.orderId,
            transactionId: data.transactionId,
          },
        });
      }

      // Se o pedido tem cliente, vincular a transação ao cliente também
      if (order.customerId) {
        const customerAlreadyLinked = await tx.customerTransaction.findFirst({
          where: {
            customerId: order.customerId,
            transactionId: data.transactionId,
          },
        });

        if (!customerAlreadyLinked) {
          await tx.customerTransaction.create({
            data: {
              customerId: order.customerId,
              transactionId: data.transactionId,
            },
          });
        }
      }
    });

    return { orderId: data.orderId, transactionId: data.transactionId };
  });

export async function linkOrderTransaction(data: LinkOrderTransactionProps) {
  return linkOrderTransactionServerFn({ data });
}

const unlinkOrderTransactionSchema = z.object({
  organizationId: z.uuid(),
  orderId: z.uuid(),
  transactionId: z.uuid(),
});

export type UnlinkOrderTransactionProps = z.infer<typeof unlinkOrderTransactionSchema>;

const unlinkOrderTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => unlinkOrderTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    await prisma.orderTransaction.deleteMany({
      where: {
        orderId: data.orderId,
        transactionId: data.transactionId,
      },
    });

    return { orderId: data.orderId, transactionId: data.transactionId };
  });

export async function unlinkOrderTransaction(data: UnlinkOrderTransactionProps) {
  return unlinkOrderTransactionServerFn({ data });
}
