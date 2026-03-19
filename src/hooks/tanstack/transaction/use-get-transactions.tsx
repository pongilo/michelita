import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/lib/api/transaction/get-transactions";

type UseGetTransactionsProps = {
  organizationId: string;
};

export function useGetTransactions({ organizationId }: UseGetTransactionsProps) {
  return useQuery({
    queryKey: ["transactions", organizationId],
    queryFn: async () =>
      getTransactions({
        organizationId,
      }),
    enabled: !!organizationId,
  });
}
