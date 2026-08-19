import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const toggleProductActiveSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  isActive: z.boolean(),
});

export type ToggleProductActiveProps = z.infer<typeof toggleProductActiveSchema>;

const toggleProductActiveServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => toggleProductActiveSchema.parse(input))
  .handler(async ({ data }) => {
    const updated = await prisma.product.updateMany({
      where: { id: data.id, organizationId: data.organizationId },
      data: { isActive: data.isActive },
    });

    if (updated.count === 0) {
      throw new Error("Produto não encontrado para a organização informada.");
    }

    return { id: data.id, isActive: data.isActive };
  });

export async function toggleProductActive(data: ToggleProductActiveProps) {
  return toggleProductActiveServerFn({ data });
}
