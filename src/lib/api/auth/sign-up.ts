import { supabase } from "@/lib/supabase";

type signUpProps = {
  email: string
  password: string
}

export async function signUp({ email, password }: signUpProps) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message)
  }

  return data
}