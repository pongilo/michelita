import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Nome invalido."),
  email: z.email("E-mail invalido."),
  password: z.string().min(6, "Senha invalida."),
});

type SignUpProps = z.input<typeof signUpSchema>

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

    return authData;
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
