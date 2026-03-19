import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
  unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade minima: 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
  note: z.string().trim().optional(),
});

const updateOrderSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  customerId: z.uuid().nullable().optional(),
  orderedAt: z.string().optional(),
  isPaid: z.boolean().optional(),
  note: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item.").optional(),
}).superRefine((value, ctx) => {
  const hasDataToUpdate =
    value.customerId !== undefined ||
    value.orderedAt !== undefined ||
    value.isPaid !== undefined ||
    value.note !== undefined ||
    value.items !== undefined;

  if (!hasDataToUpdate) {
    ctx.addIssue({
      code: "custom",
      message: "Nenhum campo foi enviado para atualizacao.",
    });
  }
});

export type UpdateOrderProps = z.infer<typeof updateOrderSchema>;

function toDateOrThrow(value: string, fieldLabel: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  return date;
}

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const updateOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          organizationId: data.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!customer) {
        throw new Error("Cliente nao encontrado para a organizacao informada.");
      }
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        id: data.id,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!existingOrder) {
      throw new Error("Pedido nao encontrado para a organizacao informada.");
    }

    const updateData: {
      customerId?: string | null;
      orderedAt?: Date;
      isPaid?: boolean;
      note?: string | null;
    } = {};

    if (data.customerId !== undefined) {
      updateData.customerId = data.customerId ?? null;
    }

    if (data.orderedAt !== undefined) {
      updateData.orderedAt = toDateOrThrow(data.orderedAt, "Data do pedido");
    }

    if (data.isPaid !== undefined) {
      updateData.isPaid = data.isPaid;
    }

    if (data.note !== undefined) {
      updateData.note = toOptionalString(data.note);
    }

    await prisma.$transaction(async (transaction) => {
      if (Object.keys(updateData).length > 0) {
        await transaction.order.update({
          where: {
            id: data.id,
          },
          data: updateData,
        });
      }

      if (data.items !== undefined) {
        await transaction.orderItem.deleteMany({
          where: {
            orderId: data.id,
          },
        });

        await transaction.orderItem.createMany({
          data: data.items.map((item) => ({
            orderId: data.id,
            description: item.description,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            total: Number((item.unitPrice * item.quantity).toFixed(2)),
            deliveredAt: toDateOrThrow(item.deliveredAt, "Data de entrega do item"),
            note: toOptionalString(item.note),
          })),
        });
      }
    });

    return {
      id: data.id,
    };
  });

export async function updateOrder(data: UpdateOrderProps) {
  return updateOrderServerFn({
    data,
  });
}
