import { getCustomers } from "@/lib/api/customer/get-customers";
import { useQuery } from "@tanstack/react-query";

type UseGetCustomersProps = {
  organizationId: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useGetCustomers({ organizationId, search, page = 1, pageSize = 20 }: UseGetCustomersProps) {
  return useQuery({
    queryKey: ["customers", organizationId, search, page, pageSize],
    queryFn: async () => getCustomers({ organizationId, search, page, pageSize }),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
