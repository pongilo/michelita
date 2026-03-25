import { useQuery } from "@tanstack/react-query";
import { getProductionOrdersRange } from "@/lib/api/order/get-production-orders-range";

type Props = {
  organizationId: string;
  startDate: string;
  endDate: string;
  enabled?: boolean;
};

export function useGetProductionOrdersRange({ organizationId, startDate, endDate, enabled = true }: Props) {
  return useQuery({
    queryKey: ["production-orders-range", organizationId, startDate, endDate],
    queryFn: async () => getProductionOrdersRange({ organizationId, startDate, endDate }),
    enabled: !!organizationId && enabled,
  });
}
