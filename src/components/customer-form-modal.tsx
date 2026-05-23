import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do cliente."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

type CustomerFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  errorMessage: string;
  successMessage: string;
  initialValues?: Partial<CustomerFormValues>;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
};

function getDefaultValues(initialValues?: Partial<CustomerFormValues>): CustomerFormValues {
  return {
    name: initialValues?.name ?? "",
    phone: initialValues?.phone ?? "",
    address: initialValues?.address ?? "",
    note: initialValues?.note ?? "",
  };
}

export function CustomerFormModal({
  isOpen,
  mode,
  isSubmitting,
  errorMessage,
  successMessage,
  initialValues,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(getDefaultValues(initialValues));
  }, [isOpen, initialValues?.address, initialValues?.name, initialValues?.note, initialValues?.phone, reset]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Novo cliente" : "Editar cliente"}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Nome" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Telefone</FieldLabel>
              <Input type="text" placeholder="Telefone (opcional)" {...register("phone")} />
              <FieldError>{errors.phone?.message}</FieldError>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Endereço</FieldLabel>
              <textarea
                placeholder="Endereço (opcional)"
                className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                rows={3}
                {...register("address")}
              />
              <FieldError>{errors.address?.message}</FieldError>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Observação</FieldLabel>
              <textarea
                placeholder="Observação (opcional)"
                className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                rows={3}
                {...register("note")}
              />
              <FieldError>{errors.note?.message}</FieldError>
            </Field>
          </div>
        </FieldGroup>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar cliente"
                : "Salvar alteracoes"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
