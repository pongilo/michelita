import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateCustomerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type UpdateCustomerProps = z.infer<typeof updateCustomerSchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const updateCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateCustomerSchema.parse(input))
  .handler(async ({ data }) => {
    const customer = await prisma.customer.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        phone: toOptionalString(data.phone),
        address: toOptionalString(data.address),
        note: toOptionalString(data.note),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        note: true,
      },
    });

    return customer;
  });

export async function updateCustomer(data: UpdateCustomerProps) {
  return updateCustomerServerFn({
    data,
  });
}
