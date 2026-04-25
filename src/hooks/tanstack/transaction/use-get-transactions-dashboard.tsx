import { useQuery } from "@tanstack/react-query";
import { getTransactionsDashboard } from "@/lib/api/transaction/get-transactions-dashboard";

type Props = {
  organizationId: string;
  startAt: Date;
  endAt: Date;
};

export function useGetTransactionsDashboard({ organizationId, startAt, endAt }: Props) {
  return useQuery({
    queryKey: [
      "transactions-dashboard",
      organizationId,
      startAt.toISOString(),
      endAt.toISOString(),
    ],
    queryFn: () =>
      getTransactionsDashboard({
        organizationId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    enabled: !!organizationId,
  });
}
