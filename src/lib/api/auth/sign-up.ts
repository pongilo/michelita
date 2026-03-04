import { supabase } from "@/lib/supabase";

type signUpProps = {
  email: string
  password: string
}

export async function signUp({ email, password }: signUpProps) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}