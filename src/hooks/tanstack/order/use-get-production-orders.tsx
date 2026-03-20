import { useQuery } from "@tanstack/react-query";
import { getProductionOrders } from "@/lib/api/order/get-production-orders";

type UseGetProductionOrdersProps = {
  organizationId: string;
  productionDate?: string;
};

export function useGetProductionOrders({ organizationId, productionDate }: UseGetProductionOrdersProps) {
  return useQuery({
    queryKey: ["production-orders", organizationId, productionDate ?? ""],
    queryFn: async () =>
      getProductionOrders({
        organizationId,
        productionDate,
      }),
    enabled: !!organizationId,
  });
}
