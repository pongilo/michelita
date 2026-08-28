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
    const { organizationId } = data;

    const products = await prisma.product.findMany({
      where: { organizationId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        categoryId: true,
        isActive: true,
        category: { select: { id: true, name: true } },
      },
    });

    return {
      products: products.map((p) => ({ ...p, price: Number(p.price) })),
    };
  });

export async function getProducts(props: GetProductsProps) {
  return getProductsServerFn({ data: props });
}
