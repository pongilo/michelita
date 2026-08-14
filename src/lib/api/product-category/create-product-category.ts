import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProductCategorySchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().trim().optional(),
});

export type CreateProductCategoryProps = z.infer<typeof createProductCategorySchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const createProductCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createProductCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const existingCount = await prisma.productCategory.count({
      where: { organizationId: data.organizationId },
    });

    const category = await prisma.productCategory.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: toOptionalString(data.description),
        displayOrder: existingCount,
      },
      select: {
        id: true,
        name: true,
        description: true,
        displayOrder: true,
      },
    });

    return category;
  });

export async function createProductCategory(data: CreateProductCategoryProps) {
  return createProductCategoryServerFn({ data });
}
