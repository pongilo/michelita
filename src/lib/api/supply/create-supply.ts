import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSupplySchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  unit: z.string().trim().min(1, "Informe a unidade de medida."),
  purchasePrice: z.number({ error: "Informe um preço válido." }).positive("O preço deve ser maior que zero."),
  purchaseQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  isIngredient: z.boolean(),
});

export type CreateSupplyProps = z.infer<typeof createSupplySchema>;

const createSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const supply = await prisma.supply.create({
      data: {
        organizationId: data.organizationId,
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

export async function createSupply(data: CreateSupplyProps) {
  return createSupplyServerFn({ data });
}
