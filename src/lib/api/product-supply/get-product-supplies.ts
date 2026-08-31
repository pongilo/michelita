import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductSuppliesSchema = z.object({
  productId: z.uuid(),
});

export type GetProductSuppliesProps = z.infer<typeof getProductSuppliesSchema>;

const getProductSuppliesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductSuppliesSchema.parse(input))
  .handler(async ({ data }) => {
    const items = await prisma.productSupply.findMany({
      where: { productId: data.productId },
      orderBy: { supply: { name: "asc" } },
      select: {
        id: true,
        quantity: true,
        supply: {
          select: { id: true, name: true, unit: true, costPerUnit: true },
        },
      },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        quantity: Number(item.quantity),
        supply: {
          ...item.supply,
          costPerUnit: Number(item.supply.costPerUnit),
        },
      })),
    };
  });

export async function getProductSupplies(props: GetProductSuppliesProps) {
  return getProductSuppliesServerFn({ data: props });
}
