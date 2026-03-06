import { getCustomers } from "@/lib/api/customer/get-customers";
import { useQuery } from "@tanstack/react-query";

type UseGetCustomersProps = {
  organizationId: string;
};

export function useGetCustomers({ organizationId }: UseGetCustomersProps) {
  return useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => getCustomers({ organizationId }),
    enabled: !!organizationId,
  });
}
