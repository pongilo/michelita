import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteOrderSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteOrderProps = z.infer<typeof deleteOrderSchema>;

const deleteOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.order.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    return {
      id: data.id,
    };
  });

export async function deleteOrder(data: DeleteOrderProps) {
  return deleteOrderServerFn({
    data,
  });
}
