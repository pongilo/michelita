import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateProductSupplySchema = z.object({
  id: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type UpdateProductSupplyProps = z.infer<typeof updateProductSupplySchema>;

const updateProductSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const productSupply = await prisma.productSupply.update({
      where: { id: data.id },
      data: { quantity: data.quantity },
      select: { id: true },
    });

    return productSupply;
  });

export async function updateProductSupply(data: UpdateProductSupplyProps) {
  return updateProductSupplyServerFn({ data });
}
