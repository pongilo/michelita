import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getSuppliesSchema = z.object({
  organizationId: z.uuid(),
});

export type GetSuppliesProps = z.infer<typeof getSuppliesSchema>;

const getSuppliesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getSuppliesSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId } = data;

    const supplies = await prisma.supply.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        purchasePrice: true,
        purchaseQuantity: true,
        costPerUnit: true,
        updatedAt: true,
        _count: { select: { product: true } },
      },
    });

    return {
      supplies: supplies.map((supply) => ({
        ...supply,
        purchasePrice: Number(supply.purchasePrice),
        purchaseQuantity: Number(supply.purchaseQuantity),
        costPerUnit: Number(supply.costPerUnit),
      })),
    };
  });

export async function getSupplies(props: GetSuppliesProps) {
  return getSuppliesServerFn({ data: props });
}
