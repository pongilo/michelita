import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteSupplySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

export type DeleteSupplyProps = z.infer<typeof deleteSupplySchema>;

const deleteSupplyServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSupplySchema.parse(input))
  .handler(async ({ data }) => {
    const deleted = await prisma.supply.deleteMany({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Insumo não encontrado para a organização informada.");
    }

    return { id: data.id };
  });

export async function deleteSupply(data: DeleteSupplyProps) {
  return deleteSupplyServerFn({ data });
}
