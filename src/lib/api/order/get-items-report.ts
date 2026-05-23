import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getItemsReportSchema = z.object({
  organizationId: z.uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

export type GetItemsReportProps = z.infer<typeof getItemsReportSchema>;

const getItemsReportServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => getItemsReportSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, year, month } = data;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const rows = await prisma.$queryRaw<Array<{ description: string; total_qty: number }>>`
      SELECT oi.description, SUM(oi.quantity)::int AS total_qty
      FROM order_item oi
      JOIN "order" o ON o.id = oi.order_id
      WHERE oi.delivered_at >= ${start}
        AND oi.delivered_at < ${end}
        AND o.organization_id = ${organizationId}::uuid
      GROUP BY oi.description
      ORDER BY total_qty DESC
    `;

    const totalItems = rows.reduce((sum, r) => sum + Number(r.total_qty), 0);

    return {
      items: rows.map((r) => ({
        description: r.description,
        quantity: Number(r.total_qty),
      })),
      totalItems,
      periodStart: start.toISOString(),
    };
  });

export async function getItemsReport(data: GetItemsReportProps) {
  return getItemsReportServerFn({ data });
}
