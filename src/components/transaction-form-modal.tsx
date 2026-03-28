import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const transactionFormSchema = z.object({
  type: z.enum(["entry", "exit"]),
  amount: z.number().min(0.01, "Informe um valor maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data/hora da transacao e obrigatoria."),
  linkedCustomerId: z.union([z.uuid(), z.literal("")]).optional(),
  linkedOrderId: z.union([z.uuid(), z.literal("")]).optional(),
  description: z.string().trim().max(500, "A descricao deve ter no maximo 500 caracteres.").optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

type CustomerOption = {
  id: string;
  name: string;
};

type OrderOption = {
  id: string;
  label: string;
};

type TransactionFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  isDeleting?: boolean;
  customers: CustomerOption[];
  orders?: OrderOption[];
  fixedLinkedCustomer?: CustomerOption;
  fixedLinkedOrder?: OrderOption;
  errorMessage: string;
  successMessage: string;
  initialValues?: Partial<TransactionFormValues>;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultValues(initialValues?: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    type: initialValues?.type ?? "entry",
    amount: initialValues?.amount ?? 0,
    method: initialValues?.method ?? "pix",
    madeAt: initialValues?.madeAt ?? localDatetimeNow(),
    linkedCustomerId: initialValues?.linkedCustomerId ?? "",
    linkedOrderId: initialValues?.linkedOrderId ?? "",
    description: initialValues?.description ?? "",
  };
}

export function TransactionFormModal({
  isOpen,
  mode,
  isSubmitting,
  isDeleting,
  customers,
  orders,
  fixedLinkedCustomer,
  fixedLinkedOrder,
  errorMessage,
  successMessage,
  initialValues,
  onClose,
  onSubmit,
  onDelete,
}: TransactionFormModalProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(getDefaultValues(initialValues));
  }, [
    isOpen,
    initialValues?.amount,
    initialValues?.description,
    initialValues?.linkedCustomerId,
    initialValues?.linkedOrderId,
    initialValues?.madeAt,
    initialValues?.method,
    initialValues?.type,
    reset,
  ]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Nova transacao" : "Editar transacao"}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="exit">Saida</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Valor</FieldLabel>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
              <FieldError>{errors.amount?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Metodo</FieldLabel>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartao de credito</SelectItem>
                      <SelectItem value="debit_card">Cartao de debito</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Data/hora</FieldLabel>
              <Input type="datetime-local" {...register("madeAt")} />
              <FieldError>{errors.madeAt?.message}</FieldError>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Descricao (opcional)</FieldLabel>
              <Input type="text" placeholder="Descricao" {...register("description")} />
              <FieldError>{errors.description?.message}</FieldError>
            </Field>

            {fixedLinkedCustomer ? (
              <Field className="md:col-span-2">
                <FieldLabel>Cliente vinculado</FieldLabel>
                <input type="hidden" {...register("linkedCustomerId")} />
                <div className="flex h-9 w-full items-center rounded-4xl border border-input bg-input/30 px-3 text-sm opacity-70">
                  {fixedLinkedCustomer.name}
                </div>
              </Field>
            ) : (
              <Field className="md:col-span-2">
                <FieldLabel>Cliente vinculado (opcional)</FieldLabel>
                <Controller
                  name="linkedCustomerId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem cliente vinculado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem cliente vinculado</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}

            {fixedLinkedOrder ? (
              <Field className="md:col-span-2">
                <FieldLabel>Pedido vinculado</FieldLabel>
                <input type="hidden" {...register("linkedOrderId")} value={fixedLinkedOrder.id} />
                <div className="flex h-9 w-full items-center rounded-4xl border border-input bg-input/30 px-3 text-sm opacity-70">
                  {fixedLinkedOrder.label}
                </div>
              </Field>
            ) : orders && orders.length > 0 ? (
              <Field className="md:col-span-2">
                <FieldLabel>Pedido vinculado (opcional)</FieldLabel>
                <Controller
                  name="linkedOrderId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem pedido vinculado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem pedido vinculado</SelectItem>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}
          </div>
        </FieldGroup>

        {errorMessage ? (
          <div className="alert alert-error">
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="alert alert-success">
            <span>{successMessage}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div>
            {mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-error"
                disabled={isSubmitting || isDeleting}
                onClick={onDelete}
              >
                {isDeleting ? "Excluindo..." : "Excluir transação"}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting
                ? "Salvando..."
                : mode === "create"
                  ? "Registrar transacao"
                  : "Salvar alteracoes"}
            </Button>
          </div>
        </div>
      </form>
    </FormModal>
  );
}
