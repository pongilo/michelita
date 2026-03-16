import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type CreateOrganizationProps = z.infer<typeof createOrganizationSchema>;

const createOrganizationServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrganizationSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: userData, error } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;

    const authSessionMissing =
      !!error && error.message.toLowerCase().includes("auth session missing");

    if (error && !authSessionMissing) {
      throw new Error(error.message);
    }

    if (!ownerId) {
      throw new Error("Usuario nao autenticado.");
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        ownerId,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!organization) {
      return null
    }

    return organization
  });

export async function createOrganization({ name }: CreateOrganizationProps) {
  return createOrganizationServerFn({
    data: {
      name,
    },
  });
}
