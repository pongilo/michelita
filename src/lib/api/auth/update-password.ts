import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type UpdatePasswordProps = z.infer<typeof updatePasswordSchema>;

const updatePasswordServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updatePasswordSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();

    const { data: authData, error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return authData;
  });

export async function updatePassword({ password, confirmPassword }: UpdatePasswordProps) {
  return updatePasswordServerFn({ data: { password, confirmPassword } });
}
