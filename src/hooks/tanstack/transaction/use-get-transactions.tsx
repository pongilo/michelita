import { getTransactions } from "@/lib/api/transaction/get-transactions";
import { useQuery } from "@tanstack/react-query";

type UseGetTransactionsProps = {
  organizationId: string;
  startAt: Date;
  endAt: Date;
};

export function useGetTransactions({ organizationId, startAt, endAt }: UseGetTransactionsProps) {
  return useQuery({
    queryKey: ["transactions", organizationId, startAt.toISOString(), endAt.toISOString()],
    queryFn: async () =>
      getTransactions({
        organizationId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    enabled: !!organizationId,
  });
}
