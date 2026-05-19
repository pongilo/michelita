import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getCustomersRankingSchema = z.object({
  organizationId: z.uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

export type GetCustomersRankingProps = z.infer<typeof getCustomersRankingSchema>;

const getCustomersRankingServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => getCustomersRankingSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, year, month } = data;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        phone: string | null;
        order_count: number;
        total_spent: string;
      }>
    >`
      SELECT c.id, c.name, c.phone,
             COUNT(o.id)::int AS order_count,
             SUM(o.total)::text AS total_spent
      FROM customer c
      JOIN "order" o ON o.customer_id = c.id
      WHERE o.ordered_at >= ${start}
        AND o.ordered_at < ${end}
        AND o.organization_id = ${organizationId}::uuid
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_spent DESC
    `;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      orderCount: Number(r.order_count),
      totalSpent: Number(r.total_spent),
    }));
  });

export async function getCustomersRanking(data: GetCustomersRankingProps) {
  return getCustomersRankingServerFn({ data });
}
