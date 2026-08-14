import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_CATEGORY = "none";

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do produto."),
  price: z.number({ error: "Informe um preço válido." }).min(0, "O preço deve ser maior ou igual a zero."),
  categoryId: z.uuid().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductCategoryOption = { id: string; name: string };

type ProductFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<ProductFormValues>;
  categories: ProductCategoryOption[];
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
};

function getDefaultValues(initialValues?: Partial<ProductFormValues>): ProductFormValues {
  return {
    name: initialValues?.name ?? "",
    price: initialValues?.price ?? 0,
    categoryId: initialValues?.categoryId,
  };
}

export function ProductFormModal({
  isOpen,
  mode,
  isSubmitting,
  initialValues,
  categories,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(getDefaultValues(initialValues));
  }, [isOpen, initialValues?.name, initialValues?.price, initialValues?.categoryId, reset]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Novo produto" : "Editar produto"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Nome do produto" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Preço (R$)</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register("price", { valueAsNumber: true })}
            />
            <FieldError>{errors.price?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Categoria</FieldLabel>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_CATEGORY}
                  onValueChange={(value) => field.onChange(value === NO_CATEGORY ? undefined : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.categoryId?.message}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar produto"
                : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
