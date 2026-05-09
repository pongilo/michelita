import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useUpdateOrderInfo } from "@/hooks/tanstack/order/use-update-order-info";
import { LoadingState } from "./ui/loading-state";
import { localDatetime } from "@/lib/utils/formatter";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
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
  customerId: string | null;
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const { mutateAsync, isPending } = useUpdateOrderInfo({ organizationId });
  const { data: customersData, isLoading: isLoadingCustomers } = useGetCustomers({ organizationId });
  const customers = customersData?.customers ?? [];
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: "",
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
        customerId: order.customerId ?? "",
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
        customerId: values.customerId || null,
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

  async function handleCreateCustomer(values: CustomerFormValues) {
    try {
      const customer = await createCustomer({
        organizationId,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });
      setValue("customerId", customer.id, { shouldValidate: true });
      setIsCustomerModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cliente.");
    }
  }

  const customerOptions = [
    { value: "", label: "Sem cliente vinculado" },
    ...customers.map((c) => ({
      value: c.id,
      label: [c.name, c.phone, c.address].filter(Boolean).join(" · "),
    })),
  ];

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
                <FieldLabel>Cliente (opcional)</FieldLabel>
                {isLoadingCustomers && <LoadingState label="Carregando clientes..." />}
                <div className="flex gap-2 items-center">
                  <Controller
                    name="customerId"
                    control={control}
                    render={({ field }) => (
                      <Select items={customerOptions} value={field.value} onValueChange={field.onChange} disabled={isLoadingCustomers}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sem cliente vinculado" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Cadastrar novo cliente"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="shrink-0"
                  >
                    +
                  </Button>
                </div>
              </Field>

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

      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage=""
        successMessage=""
        onClose={() => setIsCustomerModalOpen(false)}
        onSubmit={handleCreateCustomer}
      />
    </>
  );
}
