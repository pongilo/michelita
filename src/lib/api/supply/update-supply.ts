import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSupplySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  unit: z.string().trim().min(1, "Informe a unidade de medida."),
  purchasePrice: z.number({ error: "Informe um preço válido." }).positive("O preço deve ser maior que zero."),
  purchaseQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  isIngredient: z.boolean(),
});

export type UpdateSupplyProps = z.infer<typeof updateSupplySchema>;

const updateSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const supply = await prisma.supply.update({
      where: { id: data.id },
      data: {
        name: data.name,
        unit: data.unit,
        purchasePrice: data.purchasePrice,
        purchaseQuantity: data.purchaseQuantity,
        costPerUnit: data.purchasePrice / data.purchaseQuantity,
        isIngredient: data.isIngredient,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        purchasePrice: true,
        purchaseQuantity: true,
        costPerUnit: true,
        isIngredient: true,
        updatedAt: true,
      },
    });

    return {
      ...supply,
      purchasePrice: Number(supply.purchasePrice),
      purchaseQuantity: Number(supply.purchaseQuantity),
      costPerUnit: Number(supply.costPerUnit),
    };
  });

export async function updateSupply(data: UpdateSupplyProps) {
  return updateSupplyServerFn({ data });
}
