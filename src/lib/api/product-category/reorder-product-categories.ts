import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reorderProductCategoriesSchema = z.object({
  organizationId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderProductCategoriesProps = z.infer<typeof reorderProductCategoriesSchema>;

const reorderProductCategoriesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reorderProductCategoriesSchema.parse(input))
  .handler(async ({ data }) => {
    await prisma.$transaction(
      data.orderedIds.map((id, index) =>
        prisma.productCategory.updateMany({
          where: { id, organizationId: data.organizationId },
          data: { displayOrder: index },
        }),
      ),
    );

    return { orderedIds: data.orderedIds };
  });

export async function reorderProductCategories(data: ReorderProductCategoriesProps) {
  return reorderProductCategoriesServerFn({ data });
}
