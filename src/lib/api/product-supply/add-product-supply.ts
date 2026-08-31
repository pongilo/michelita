import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/prisma";

const addProductSupplySchema = z.object({
  productId: z.uuid(),
  supplyId: z.uuid(),
  quantity: z.number({ error: "Informe uma quantidade válida." }).positive("A quantidade deve ser maior que zero."),
});

export type AddProductSupplyProps = z.infer<typeof addProductSupplySchema>;

const addProductSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => addProductSupplySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const productSupply = await prisma.productSupply.create({
        data: {
          productId: data.productId,
          supplyId: data.supplyId,
          quantity: data.quantity,
        },
        select: { id: true },
      });

      return productSupply;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Este insumo já está na ficha técnica do produto.");
      }
      throw error;
    }
  });

export async function addProductSupply(data: AddProductSupplyProps) {
  return addProductSupplyServerFn({ data });
}
