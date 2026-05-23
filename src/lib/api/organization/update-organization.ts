import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type UpdateOrganizationProps = z.infer<typeof updateOrganizationSchema>;

const updateOrganizationServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateOrganizationSchema.parse(input))
  .handler(async ({ data }) => {
    const organization = await prisma.organization.update({
      where: { id: data.id },
      data: { name: data.name },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    return organization;
  });

export async function updateOrganization({ id, name }: UpdateOrganizationProps) {
  return updateOrganizationServerFn({ data: { id, name } });
}
