import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateProductCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().trim().optional(),
  displayLimit: z.number().int().min(1).optional(),
});

export type UpdateProductCategoryProps = z.infer<typeof updateProductCategorySchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const updateProductCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const category = await prisma.productCategory.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: toOptionalString(data.description),
        displayLimit: data.displayLimit ?? null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        displayLimit: true,
      },
    });

    return category;
  });

export async function updateProductCategory(data: UpdateProductCategoryProps) {
  return updateProductCategoryServerFn({ data });
}
