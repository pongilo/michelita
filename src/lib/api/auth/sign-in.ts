import { supabase } from "@/lib/supabase";

type signInProps = {
  email: string
  password: string
}

export async function signIn({ email, password }: signInProps) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}