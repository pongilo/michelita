import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";

const customerFormSchema = z.object({
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
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <input type="text" placeholder="Nome" className="input input-bordered w-full" {...register("name")} />
            {errors.name ? <span className="text-sm text-error">{errors.name.message}</span> : null}
          </label>

          <input type="text" placeholder="Telefone (opcional)" className="input input-bordered w-full" {...register("phone")} />

          <textarea
            placeholder="Endereço (opcional)"
            className="textarea textarea-bordered w-full md:col-span-2"
            rows={3}
            {...register("address")}
          />

          <textarea
            placeholder="Observação (opcional)"
            className="textarea textarea-bordered w-full md:col-span-2"
            rows={3}
            {...register("note")}
          />
        </div>

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

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar cliente"
                : "Salvar alteracoes"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
