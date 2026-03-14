import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type GetOrganizationProps = {
  userId: string
}

const getOrganizationSchema = z.object({
  userId: z.uuid("ID de usuario invalido."),
});

const getOrganizationServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrganizationSchema.parse(input))
  .handler(async ({ data }) => {
    const organization = await prisma.organization.findUnique({
      where: {
        ownerId: data.userId,
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

export async function getOrganization({ userId }: GetOrganizationProps) {
  return getOrganizationServerFn({
    data: {
      userId,
    },
  });
}
