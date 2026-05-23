import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductsSchema = z.object({
  organizationId: z.uuid(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type GetProductsProps = z.infer<typeof getProductsSchema>;

const getProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductsSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, search, page, pageSize } = data;
    const skip = (page - 1) * pageSize;

    const where = {
      organizationId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
        select: { id: true, name: true, price: true },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p: { id: string; name: string; price: { toNumber: () => number } | number }) => ({ ...p, price: Number(p.price) })),
      total,
      page,
      pageSize,
    };
  });

export async function getProducts(props: GetProductsProps) {
  return getProductsServerFn({ data: props });
}
