import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reorderProductsSchema = z.object({
  organizationId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderProductsProps = z.infer<typeof reorderProductsSchema>;

const reorderProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reorderProductsSchema.parse(input))
  .handler(async ({ data }) => {
    await prisma.$transaction(
      async (tx) => {
        for (const [index, id] of data.orderedIds.entries()) {
          await tx.product.updateMany({
            where: { id, organizationId: data.organizationId },
            data: { displayOrder: index },
          });
        }
      },
      { timeout: 15000 },
    );

    return { orderedIds: data.orderedIds };
  });

export async function reorderProducts(data: ReorderProductsProps) {
  return reorderProductsServerFn({ data });
}
