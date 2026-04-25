import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getTransactionCategoriesSchema = z.object({
  organizationId: z.uuid(),
});

export type GetTransactionCategoriesProps = z.infer<typeof getTransactionCategoriesSchema>;

const getTransactionCategoriesServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getTransactionCategoriesSchema.parse(input))
  .handler(async ({ data }) => {
    return prisma.transactionCategory.findMany({
      where: { organizationId: data.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  });

export async function getTransactionCategories({ organizationId }: GetTransactionCategoriesProps) {
  return getTransactionCategoriesServerFn({ data: { organizationId } });
}
