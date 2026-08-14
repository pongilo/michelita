import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateProductSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  price: z.number().min(0, "O preço deve ser maior ou igual a zero."),
  categoryId: z.uuid().optional(),
});

export type UpdateProductProps = z.infer<typeof updateProductSchema>;

const updateProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductSchema.parse(input))
  .handler(async ({ data }) => {
    const product = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId ?? null,
      },
      select: {
        id: true,
        name: true,
        price: true,
        categoryId: true,
      },
    });

    return { ...product, price: Number(product.price) };
  });

export async function updateProduct(data: UpdateProductProps) {
  return updateProductServerFn({ data });
}
