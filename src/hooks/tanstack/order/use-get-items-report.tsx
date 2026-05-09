import { useQuery } from "@tanstack/react-query";
import { getItemsReport } from "@/lib/api/order/get-items-report";

type UseGetItemsReportProps = {
  organizationId: string;
  year: number;
  month: number;
};

export function useGetItemsReport({ organizationId, year, month }: UseGetItemsReportProps) {
  return useQuery({
    queryKey: ["items-report", organizationId, year, month],
    queryFn: async () => getItemsReport({ organizationId, year, month }),
    enabled: !!organizationId,
  });
}
