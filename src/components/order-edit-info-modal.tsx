import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrderInfo } from "@/hooks/tanstack/order/use-update-order-info";
import { localDatetime } from "@/lib/utils/formatter";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isPaid: z.boolean(),
  note: z.string().trim().optional(),
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetime();
  return date.toISOString().slice(0, 16);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderInfo {
  customerId?: string | null;
  orderedAt: string | Date;
  isPaid: boolean;
  note: string | null;
  shippingFee: number | null;
  discount: number | null;
}

interface OrderEditInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  organizationId: string;
  order: OrderInfo;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderEditInfoModal({ open, onOpenChange, orderId, organizationId, order }: OrderEditInfoModalProps) {
  const { mutateAsync, isPending } = useUpdateOrderInfo({ organizationId });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderedAt: localDatetime(),
      isPaid: false,
      note: "",
      shippingFee: 0,
      discount: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        orderedAt: toLocalDatetimeInput(order.orderedAt),
        isPaid: order.isPaid,
        note: order.note ?? "",
        shippingFee: order.shippingFee ?? 0,
        discount: order.discount ?? 0,
      });
    }
  }, [open, order, reset]);

  async function handleSave(values: FormValues) {
    try {
      await mutateAsync({
        id: orderId,
        organizationId,
        customerId: order.customerId ?? null,
        orderedAt: values.orderedAt,
        isPaid: values.isPaid,
        note: values.note,
        shippingFee: values.shippingFee ?? null,
        discount: values.discount ?? null,
      });
      onOpenChange(false);
      toast.success("Informações do pedido atualizadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido.");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar informações do pedido</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Data do pedido</FieldLabel>
                <Input type="datetime-local" {...register("orderedAt")} />
                <FieldError>{errors.orderedAt?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Observação do pedido</FieldLabel>
                <Textarea rows={3} {...register("note")} />
              </Field>

              <Field orientation="horizontal">
                <Controller
                  name="isPaid"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="edit-isPaid"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="edit-isPaid">Marcar como pago</Label>
              </Field>
            </FieldGroup>

            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Frete / taxa adicional</FieldLabel>
                <Input type="number" min="0" step="0.01" placeholder="0,00" {...register("shippingFee", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Desconto</FieldLabel>
                <Input type="number" min="0" step="0.01" placeholder="0,00" {...register("discount", { valueAsNumber: true })} />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
