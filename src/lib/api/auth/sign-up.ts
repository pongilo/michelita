import { supabase } from "@/lib/supabase";

type signUpProps = {
  name: string
  email: string
  password: string
}

export async function signUp({ name, email, password }: signUpProps) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw new Error(error.message)
  }

  return data
}