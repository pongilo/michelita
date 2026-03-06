import { getOrganization } from '@/lib/api/organization/get-organization'
import { useQuery } from '@tanstack/react-query'

type useGetOrganizationProps = {
  userId: string
}

export function useGetOrganization({ userId }: useGetOrganizationProps) {
  return useQuery({
    queryKey: ['organization', userId],
    queryFn: async () => getOrganization({ userId }),
    enabled: !!userId,
  })
}
