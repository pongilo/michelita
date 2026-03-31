import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderItemId: z.uuid(),
  isDelivered: z.boolean(),
  deliveredAt: z.string().optional(),
});

export type UpdateOrderItemDeliveryProps = z.infer<typeof schema>;

const updateOrderItemDeliveryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const updateData: { isDelivered: boolean; deliveredAt?: Date } = {
      isDelivered: data.isDelivered,
    };

    if (data.deliveredAt) {
      // datetime-local values have no timezone info — treat as UTC to match the display formatter (timeZone: "UTC")
      const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(data.deliveredAt) ? data.deliveredAt : data.deliveredAt + "Z";
      const date = new Date(normalized);
      if (!Number.isNaN(date.getTime())) {
        updateData.deliveredAt = date;
      }
    }

    await prisma.orderItem.update({
      where: { id: data.orderItemId },
      data: updateData,
    });

    return { id: data.orderItemId };
  });

export async function updateOrderItemDelivery(data: UpdateOrderItemDeliveryProps) {
  return updateOrderItemDeliveryServerFn({ data });
}
