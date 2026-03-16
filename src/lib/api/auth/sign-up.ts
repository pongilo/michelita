import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignUpProps = {
  name: string;
  email: string;
  password: string;
};

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Nome invalido."),
  email: z.string().email("E-mail invalido."),
  password: z.string().min(6, "Senha invalida."),
});

const signUpServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email ?? null,
          }
        : null,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : null,
    };
  });

export async function signUp({ name, email, password }: SignUpProps) {
  return signUpServerFn({
    data: {
      name,
      email,
      password,
    },
  });
}
