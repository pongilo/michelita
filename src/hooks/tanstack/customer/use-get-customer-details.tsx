import { useQuery } from "@tanstack/react-query";
import { getCustomerDetails } from "@/lib/api/customer/get-customer-details";

type UseGetCustomerDetailsProps = {
  organizationId: string;
  customerId: string;
};

export function useGetCustomerDetails({ organizationId, customerId }: UseGetCustomerDetailsProps) {
  return useQuery({
    queryKey: ["customer", organizationId, customerId],
    queryFn: async () =>
      getCustomerDetails({
        organizationId,
        customerId,
      }),
    enabled: !!organizationId && !!customerId,
  });
}
