import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteTransactionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteTransactionProps = z.infer<typeof deleteTransactionSchema>;

const deleteTransactionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteTransactionSchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.transaction.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Transacao nao encontrada para a organizacao informada.");
    }

    return {
      id: data.id,
    };
  });

export async function deleteTransaction(data: DeleteTransactionProps) {
  return deleteTransactionServerFn({
    data,
  });
}
