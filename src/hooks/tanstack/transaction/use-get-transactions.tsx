import { useQuery } from "@tanstack/react-query";
import { getTransactions, type TransactionsPeriod } from "@/lib/api/transaction/get-transactions";

type UseGetTransactionsProps = {
  organizationId: string;
  period: TransactionsPeriod;
  referenceDate: string;
};

export function useGetTransactions({ organizationId, period, referenceDate }: UseGetTransactionsProps) {
  return useQuery({
    queryKey: ["transactions", organizationId, period, referenceDate],
    queryFn: async () => getTransactions({ organizationId, period, referenceDate }),
    enabled: !!organizationId,
  });
}
