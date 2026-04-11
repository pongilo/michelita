import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductsSchema = z.object({
  organizationId: z.uuid(),
});

export type GetProductsProps = z.infer<typeof getProductsSchema>;

const getProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductsSchema.parse(input))
  .handler(async ({ data }) => {
    const products = await prisma.product.findMany({
      where: {
        organizationId: data.organizationId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    return products.map((p: { id: string; name: string; price: { toNumber: () => number } | number }) => ({ ...p, price: Number(p.price) }));
  });

export async function getProducts({ organizationId }: GetProductsProps) {
  return getProductsServerFn({ data: { organizationId } });
}
