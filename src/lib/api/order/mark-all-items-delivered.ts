import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderId: z.uuid(),
});

const markAllItemsDeliveredServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    await prisma.orderItem.updateMany({
      where: { orderId: data.orderId, isDelivered: false },
      data: { isDelivered: true },
    });
    return { orderId: data.orderId };
  });

export async function markAllItemsDelivered(data: { orderId: string }) {
  return markAllItemsDeliveredServerFn({ data });
}
