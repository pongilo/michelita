import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const getOrganizationSchema = z.object({
  ownerId: z.uuid(),
});

export type GetOrganizationProps = z.infer<typeof getOrganizationSchema>;

const getOrganizationServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrganizationSchema.parse(input))
  .handler(async ({ data }) => {
    const organization = await prisma.organization.findUnique({
      where: {
        ownerId: data.ownerId,
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

export async function getOrganization({ ownerId }: GetOrganizationProps) {
  return getOrganizationServerFn({
    data: { 
      ownerId 
    }
  });
}
