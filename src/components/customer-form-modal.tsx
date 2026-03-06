import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import type { Database } from "@/lib/database.types";

const customerSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
  phone: z.string().optional(),
  note: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;
type Customer = Database["public"]["Tables"]["customer"]["Row"];

type CustomerFormModalProps = {
  isOpen: boolean;
  organizationId: string;
  customerToEdit: Customer | null;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

export function CustomerFormModal({
  isOpen,
  organizationId,
  customerToEdit,
  onSuccess,
  onClose,
}: CustomerFormModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = !!customerToEdit;
  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutateAsync: updateCustomer, isPending: isUpdating } = useUpdateCustomer({ organizationId });
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      note: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (customerToEdit) {
      reset({
        name: customerToEdit.name,
        phone: customerToEdit.phone ?? "",
        note: customerToEdit.note ?? "",
      });
      return;
    }

    reset({
      name: "",
      phone: "",
      note: "",
    });
  }, [isOpen, customerToEdit, reset]);

  async function onSubmit(values: CustomerFormValues) {
    if (!organizationId) {
      setErrorMessage("Organizacao nao encontrada.");
      return;
    }

    setErrorMessage("");

    try {
      if (customerToEdit) {
        await updateCustomer({
          id: customerToEdit.id,
          name: values.name,
          phone: values.phone,
          note: values.note,
        });
        onSuccess("Cliente atualizado com sucesso.");
      } else {
        await createCustomer({
          organizationId,
          name: values.name,
          phone: values.phone,
          note: values.note,
        });
        onSuccess("Cliente adicionado com sucesso.");
      }

      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao salvar cliente.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h2 className="text-lg font-semibold">{isEditing ? "Editar cliente" : "Adicionar cliente"}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4">
          <label className="space-y-1">
            <span className="label">Nome</span>
            <input type="text" {...register("name")} className="input input-bordered w-full" />
            {errors.name ? <span className="text-error-content text-sm">{errors.name.message}</span> : null}
          </label>

          <label className="space-y-1">
            <span className="label">Telefone</span>
            <input type="text" {...register("phone")} className="input input-bordered w-full" />
          </label>

          <label className="space-y-1">
            <span className="label">Observacao</span>
            <textarea {...register("note")} className="textarea textarea-bordered w-full" rows={3} />
          </label>

          {errorMessage ? (
            <div className="alert alert-error">
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Adicionar cliente"}
            </button>
          </div>
        </form>
      </div>
      <button type="button" aria-label="fechar" className="modal-backdrop" onClick={onClose}>
        fechar
      </button>
    </div>
  );
}
