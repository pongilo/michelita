import { useQuery } from "@tanstack/react-query";
import { getCustomersRanking } from "@/lib/api/customer/get-customers-ranking";

type UseGetCustomersRankingProps = {
  organizationId: string;
  year: number;
  month: number;
};

export function useGetCustomersRanking({ organizationId, year, month }: UseGetCustomersRankingProps) {
  return useQuery({
    queryKey: ["customers-ranking", organizationId, year, month],
    queryFn: async () => getCustomersRanking({ organizationId, year, month }),
    enabled: !!organizationId,
  });
}
