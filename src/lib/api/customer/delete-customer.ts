import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteCustomerSchema = z.object({
  id: z.uuid(),
});

export type DeleteCustomerProps = z.infer<typeof deleteCustomerSchema>;

const deleteCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteCustomerSchema.parse(input))
  .handler(async ({ data }) => {
    const orderCount = await prisma.order.count({
      where: {
        customerId: data.id,
      },
    });

    if (orderCount > 0) {
      throw new Error("Nao e possivel excluir um cliente com pedidos vinculados.");
    }

    await prisma.customer.delete({
      where: {
        id: data.id,
      },
    });

    return {
      id: data.id,
    };
  });

export async function deleteCustomer(data: DeleteCustomerProps) {
  return deleteCustomerServerFn({
    data,
  });
}
