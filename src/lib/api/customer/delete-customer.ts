import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteCustomerSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteCustomerProps = z.infer<typeof deleteCustomerSchema>;

const deleteCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteCustomerSchema.parse(input))
  .handler(async ({ data }) => {
    const orderCount = await prisma.order.count({
      where: {
        customerId: data.id,
        organizationId: data.organizationId,
      },
    });

    if (orderCount > 0) {
      throw new Error("Nao e possivel excluir um cliente com pedidos vinculados.");
    }

    const deleted = await prisma.customer.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Cliente nao encontrado para a organizacao informada.");
    }

    return {
      id: data.id,
    };
  });

export async function deleteCustomer(data: DeleteCustomerProps) {
  return deleteCustomerServerFn({
    data,
  });
}
