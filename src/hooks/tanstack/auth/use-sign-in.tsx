import { signIn } from '@/lib/api/auth/sign-in'
import { useMutation } from '@tanstack/react-query'

export function useSignIn() {
  return useMutation({
    mutationFn: signIn,
  })
}