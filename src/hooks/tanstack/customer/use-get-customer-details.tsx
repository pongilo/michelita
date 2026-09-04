import { useInfiniteQuery } from "@tanstack/react-query";
import { CUSTOMER_ORDERS_PAGE_SIZE, getCustomerDetails } from "@/lib/api/customer/get-customer-details";

type UseGetCustomerDetailsProps = {
  organizationId: string;
  customerId: string;
};

export function useGetCustomerDetails({ organizationId, customerId }: UseGetCustomerDetailsProps) {
  return useInfiniteQuery({
    queryKey: ["customer", organizationId, customerId],
    queryFn: async ({ pageParam }) =>
      getCustomerDetails({
        organizationId,
        customerId,
        limit: CUSTOMER_ORDERS_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((sum, page) => sum + page.orders.length, 0) : undefined,
    enabled: !!organizationId && !!customerId,
  });
}
