import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteProductSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteProductProps = z.infer<typeof deleteProductSchema>;

const deleteProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteProductSchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.product.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Produto não encontrado para a organização informada.");
    }

    return { id: data.id };
  });

export async function deleteProduct(data: DeleteProductProps) {
  return deleteProductServerFn({ data });
}
