import { supabase } from "@/lib/supabase";

type signInProps = {
  email: string
  password: string
}

export async function signIn({ email, password }: signInProps) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message)
  }

  return data
}