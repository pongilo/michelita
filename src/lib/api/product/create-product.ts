import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProductSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().trim().optional(),
  imageUrl: z.url().optional(),
  price: z.number().min(0, "O preço deve ser maior ou igual a zero."),
  categoryId: z.uuid().optional(),
});

export type CreateProductProps = z.infer<typeof createProductSchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const createProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createProductSchema.parse(input))
  .handler(async ({ data }) => {
    const categoryId = data.categoryId ?? null;

    const existingCount = await prisma.product.count({
      where: { organizationId: data.organizationId, categoryId },
    });

    const product = await prisma.product.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: toOptionalString(data.description),
        imageUrl: data.imageUrl ?? null,
        price: data.price,
        categoryId,
        displayOrder: existingCount,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        categoryId: true,
      },
    });

    return { ...product, price: Number(product.price) };
  });

export async function createProduct(data: CreateProductProps) {
  return createProductServerFn({ data });
}
