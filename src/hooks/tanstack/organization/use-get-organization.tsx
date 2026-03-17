import { getOrganization, GetOrganizationProps } from "@/lib/api/organization/get-organization";
import { useQuery } from "@tanstack/react-query";

export function useGetOrganization({ ownerId }: GetOrganizationProps) {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async () => getOrganization({ ownerId }),
    enabled: !!ownerId
  });
}
