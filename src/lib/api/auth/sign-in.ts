import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignInProps = {
  email: string;
  password: string;
};

const signInSchema = z.object({
  email: z.string().email("E-mail invalido."),
  password: z.string().min(6, "Senha invalida."),
});

const signInServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signInSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!authData.user) {
      throw new Error("Falha ao autenticar usuario.");
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? null,
      },
    };
  });

export async function signIn({ email, password }: SignInProps) {
  return signInServerFn({
    data: {
      email,
      password,
    },
  });
}
