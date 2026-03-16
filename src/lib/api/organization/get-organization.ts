import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getOrganizationServerFn = createServerFn({ method: "POST" }).handler(async () => {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    const userId = data.user?.id;

    const authSessionMissing =
      !!error && error.message.toLowerCase().includes("auth session missing");

    if (error && !authSessionMissing) {
      throw new Error(error.message);
    }

    if (!userId) {
      throw new Error("Usuario nao autenticado.");
    }

    const organization = await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!organization) {
      return null;
    }

    return organization;
  });

export async function getOrganization() {
  return getOrganizationServerFn();
}
