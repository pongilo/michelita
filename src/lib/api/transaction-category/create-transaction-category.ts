import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createTransactionCategorySchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome."),
});

export type CreateTransactionCategoryProps = z.infer<typeof createTransactionCategorySchema>;

const createTransactionCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createTransactionCategorySchema.parse(input))
  .handler(async ({ data }) => {
    return prisma.transactionCategory.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
      },
      select: { id: true, name: true },
    });
  });

export async function createTransactionCategory(data: CreateTransactionCategoryProps) {
  return createTransactionCategoryServerFn({ data });
}
