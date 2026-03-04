import { getUser } from '@/lib/api/auth/get-user'
import { useQuery } from '@tanstack/react-query'

export function useGetUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => getUser(),
  })
}