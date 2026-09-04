import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  organizationId: z.uuid(),
  orderIds: z.array(z.uuid()).min(1),
  isPaid: z.boolean(),
});

export type BulkUpdateOrdersPaidProps = z.infer<typeof schema>;

const bulkUpdateOrdersPaidServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await prisma.order.updateMany({
      where: { id: { in: data.orderIds }, organizationId: data.organizationId },
      data: { isPaid: data.isPaid },
    });
    return { orderIds: data.orderIds };
  });

export async function bulkUpdateOrdersPaid(data: BulkUpdateOrdersPaidProps) {
  return bulkUpdateOrdersPaidServerFn({ data });
}
