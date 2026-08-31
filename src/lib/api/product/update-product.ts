import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateProductSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().trim().optional(),
  imageUrl: z.url().optional(),
  price: z.number().min(0, "O preço deve ser maior ou igual a zero."),
  multiplier: z.number().positive("O multiplicador deve ser maior que zero.").optional(),
  categoryId: z.uuid().optional(),
});

export type UpdateProductProps = z.infer<typeof updateProductSchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const updateProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductSchema.parse(input))
  .handler(async ({ data }) => {
    const product = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: toOptionalString(data.description),
        imageUrl: data.imageUrl ?? null,
        price: data.price,
        multiplier: data.multiplier ?? null,
        categoryId: data.categoryId ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        multiplier: true,
        categoryId: true,
      },
    });

    return {
      ...product,
      price: Number(product.price),
      multiplier: product.multiplier !== null ? Number(product.multiplier) : null,
    };
  });

export async function updateProduct(data: UpdateProductProps) {
  return updateProductServerFn({ data });
}
