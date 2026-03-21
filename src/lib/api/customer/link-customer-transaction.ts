import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  organizationId: z.uuid(),
  customerId: z.uuid(),
  transactionId: z.uuid(),
});

export type LinkCustomerTransactionProps = z.infer<typeof schema>;

const linkCustomerTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: data.organizationId },
      select: { id: true },
    });
    if (!customer) throw new Error("Cliente nao encontrado para a organizacao informada.");

    const transaction = await prisma.transaction.findFirst({
      where: { id: data.transactionId, organizationId: data.organizationId },
      select: { id: true },
    });
    if (!transaction) throw new Error("Transacao nao encontrada para a organizacao informada.");

    const already = await prisma.customerTransaction.findFirst({
      where: { customerId: data.customerId, transactionId: data.transactionId },
    });

    if (!already) {
      await prisma.customerTransaction.create({
        data: { customerId: data.customerId, transactionId: data.transactionId },
      });
    }

    return { customerId: data.customerId, transactionId: data.transactionId };
  });

export async function linkCustomerTransaction(data: LinkCustomerTransactionProps) {
  return linkCustomerTransactionServerFn({ data });
}
