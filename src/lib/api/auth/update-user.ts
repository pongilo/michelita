import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").optional(),
  email: z.email("E-mail inválido.").optional(),
});

type UpdateUserProps = z.infer<typeof updateUserSchema>;

const updateUserServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateUserSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();

    const { data: authData, error } = await supabase.auth.updateUser({
      ...(data.email ? { email: data.email } : {}),
      ...(data.name ? { data: { name: data.name } } : {}),
    });

    if (error) {
      throw new Error(error.message);
    }

    return authData;
  });

export async function updateUser({ name, email }: UpdateUserProps) {
  return updateUserServerFn({ data: { name, email } });
}
