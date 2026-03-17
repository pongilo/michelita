import { getOrganization } from '@/lib/api/organization/get-organization'
import { useQuery } from '@tanstack/react-query'

export function useGetOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => getOrganization(),
  })
}
