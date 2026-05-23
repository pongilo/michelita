import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProductSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  price: z.number().min(0, "O preço deve ser maior ou igual a zero."),
});

export type CreateProductProps = z.infer<typeof createProductSchema>;

const createProductServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createProductSchema.parse(input))
  .handler(async ({ data }) => {
    const product = await prisma.product.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        price: data.price,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    return { ...product, price: Number(product.price) };
  });

export async function createProduct(data: CreateProductProps) {
  return createProductServerFn({ data });
}
