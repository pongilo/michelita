import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getCustomersSchema = z.object({
  organizationId: z.uuid(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type GetCustomersProps = z.infer<typeof getCustomersSchema>;

const getCustomersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getCustomersSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, search, page, pageSize } = data;
    const skip = (page - 1) * pageSize;

    const where = {
      organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { address: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          note: true,
          _count: { select: { order: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, pageSize };
  });

export async function getCustomers(props: GetCustomersProps) {
  return getCustomersServerFn({ data: props });
}
