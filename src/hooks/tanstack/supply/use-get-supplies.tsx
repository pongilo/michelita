import { getSupplies } from "@/lib/api/supply/get-supplies";
import { useQuery } from "@tanstack/react-query";

type UseGetSuppliesProps = {
  organizationId: string;
};

export function useGetSupplies({ organizationId }: UseGetSuppliesProps) {
  return useQuery({
    queryKey: ["supplies", organizationId],
    queryFn: async () => getSupplies({ organizationId }),
    enabled: !!organizationId,
  });
}
