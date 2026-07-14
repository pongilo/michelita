import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getCustomersSchema = z.object({
  organizationId: z.uuid(),
});

export type GetCustomersProps = z.infer<typeof getCustomersSchema>;

const getCustomersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getCustomersSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId } = data;

    const customers = await prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        note: true,
        _count: { select: { order: true } },
      },
    });

    return { customers };
  });

export async function getCustomers(props: GetCustomersProps) {
  return getCustomersServerFn({ data: props });
}
