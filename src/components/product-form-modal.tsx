import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";

const productSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().optional(),
  price: z.number().min(0, "Preco deve ser maior ou igual a zero."),
  active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;
type Product = Database["public"]["Tables"]["product"]["Row"];

type ProductFormModalProps = {
  isOpen: boolean;
  organizationId: string;
  productToEdit: Product | null;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

export function ProductFormModal({
  isOpen,
  organizationId,
  productToEdit,
  onSuccess,
  onClose,
}: ProductFormModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = !!productToEdit;
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct({ organizationId });
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (productToEdit) {
      reset({
        name: productToEdit.name,
        description: productToEdit.description ?? "",
        price: Number(productToEdit.price),
        active: productToEdit.active,
      });
      return;
    }

    reset({
      name: "",
      description: "",
      price: 0,
      active: true,
    });
  }, [isOpen, productToEdit, reset]);

  async function onSubmit(values: ProductFormValues) {
    if (!organizationId) {
      setErrorMessage("Organizacao nao encontrada.");
      return;
    }

    setErrorMessage("");

    try {
      if (productToEdit) {
        await updateProduct({
          id: productToEdit.id,
          name: values.name,
          description: values.description,
          price: values.price,
          active: values.active,
        });
        onSuccess("Produto atualizado com sucesso.");
      } else {
        await createProduct({
          organizationId,
          name: values.name,
          description: values.description,
          price: values.price,
          active: values.active,
        });
        onSuccess("Produto adicionado com sucesso.");
      }

      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h2 className="text-lg font-semibold">{isEditing ? "Editar produto" : "Adicionar produto"}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4">
          <label className="space-y-1">
            <span className="label">Nome</span>
            <input type="text" {...register("name")} className="input input-bordered w-full" />
            {errors.name ? <span className="text-error-content text-sm">{errors.name.message}</span> : null}
          </label>

          <label className="space-y-1">
            <span className="label">Descricao</span>
            <textarea
              {...register("description")}
              className="textarea textarea-bordered w-full"
              rows={3}
            />
          </label>

          <label className="space-y-1">
            <span className="label">Preco</span>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("price", { valueAsNumber: true })}
              className="input input-bordered w-full"
            />
            {errors.price ? <span className="text-error-content text-sm">{errors.price.message}</span> : null}
          </label>

          <label className="label cursor-pointer justify-start gap-3">
            <input type="checkbox" className="checkbox" {...register("active")} />
            <span className="label-text">Produto ativo</span>
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
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Adicionar produto"}
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
