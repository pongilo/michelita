import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  itemIds: z.array(z.uuid()).min(1),
  isDelivered: z.boolean(),
});

export type BulkUpdateOrderItemsDeliveryProps = z.infer<typeof schema>;

const bulkUpdateOrderItemsDeliveryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await prisma.orderItem.updateMany({
      where: { id: { in: data.itemIds } },
      data: { isDelivered: data.isDelivered },
    });
    return { itemIds: data.itemIds };
  });

export async function bulkUpdateOrderItemsDelivery(data: BulkUpdateOrderItemsDeliveryProps) {
  return bulkUpdateOrderItemsDeliveryServerFn({ data });
}
