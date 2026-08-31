import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const removeProductSupplySchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
});

export type RemoveProductSupplyProps = z.infer<typeof removeProductSupplySchema>;

const removeProductSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeProductSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.productSupply.deleteMany({
      where: { id: data.id, productId: data.productId },
    });

    if (deleted.count === 0) {
      throw new Error("Insumo não encontrado na ficha técnica do produto.");
    }

    return { id: data.id };
  });

export async function removeProductSupply(data: RemoveProductSupplyProps) {
  return removeProductSupplyServerFn({ data });
}
