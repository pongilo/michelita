import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  ownerId: z.uuid(),
});

type CreateOrganizationProps = z.infer<typeof createOrganizationSchema>;

const createOrganizationServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrganizationSchema.parse(input))
  .handler(async ({ data }) => {
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        ownerId: data.ownerId,
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

export async function createOrganization({ name, ownerId }: CreateOrganizationProps) {
  return createOrganizationServerFn({
    data: {
      name,
      ownerId
    },
  });
}
