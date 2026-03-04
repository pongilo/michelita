import { signUp } from "@/lib/api/auth/sign-up";
import { useMutation } from "@tanstack/react-query";

export function useSignUp() {
  return useMutation({
    mutationFn: signUp,
  });
}
