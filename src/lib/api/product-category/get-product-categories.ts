import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getProductCategoriesSchema = z.object({
  organizationId: z.uuid(),
});

export type GetProductCategoriesProps = z.infer<typeof getProductCategoriesSchema>;

const getProductCategoriesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getProductCategoriesSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId } = data;

    const categories = await prisma.productCategory.findMany({
      where: { organizationId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, displayOrder: true, displayLimit: true },
    });

    return { categories };
  });

export async function getProductCategories(props: GetProductCategoriesProps) {
  return getProductCategoriesServerFn({ data: props });
}
