import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteProductCategorySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteProductCategoryProps = z.infer<typeof deleteProductCategorySchema>;

const deleteProductCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteProductCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.productCategory.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Categoria não encontrada para a organização informada.");
    }

    return { id: data.id };
  });

export async function deleteProductCategory(data: DeleteProductCategoryProps) {
  return deleteProductCategoryServerFn({ data });
}
