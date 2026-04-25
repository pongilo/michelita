import { getTransactionCategories } from "@/lib/api/transaction-category/get-transaction-categories";
import { useQuery } from "@tanstack/react-query";

type UseGetTransactionCategoriesProps = {
  organizationId: string;
};

export function useGetTransactionCategories({ organizationId }: UseGetTransactionCategoriesProps) {
  return useQuery({
    queryKey: ["transaction-categories", organizationId],
    queryFn: async () => getTransactionCategories({ organizationId }),
    enabled: !!organizationId,
  });
}
