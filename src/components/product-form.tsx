import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadProductImage } from "@/lib/supabase/upload-product-image";

const NO_CATEGORY = "none";

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do produto."),
  description: z.string().trim().optional(),
  imageUrl: z.url().optional(),
  price: z.number({ error: "Informe um preço válido." }).min(0, "O preço deve ser maior ou igual a zero."),
  categoryId: z.uuid().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductCategoryOption = { id: string; name: string };

type ProductFormProps = {
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<ProductFormValues>;
  categories: ProductCategoryOption[];
  organizationId: string;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
  onCancel: () => void;
};

function getDefaultValues(initialValues?: Partial<ProductFormValues>): ProductFormValues {
  return {
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    imageUrl: initialValues?.imageUrl,
    price: initialValues?.price ?? 0,
    categoryId: initialValues?.categoryId,
  };
}

export function ProductForm({
  mode,
  isSubmitting,
  initialValues,
  categories,
  organizationId,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: string | undefined) => void },
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadProductImage(organizationId, file);
      field.onChange(imageUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar a imagem.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel>Foto do produto</FieldLabel>
          <Controller
            name="imageUrl"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-4">
                <div className="relative size-20 flex-none overflow-hidden rounded-xl border bg-muted">
                  {field.value ? (
                    <img src={field.value} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                  {isUploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, field)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {field.value ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploadingImage}
                      onClick={() => field.onChange(undefined)}
                    >
                      <XIcon />
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
          <FieldError>{errors.imageUrl?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Nome</FieldLabel>
          <Input type="text" placeholder="Nome do produto" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Descrição</FieldLabel>
          <Textarea placeholder="Descrição do produto (opcional)" {...register("description")} />
          <FieldError>{errors.description?.message}</FieldError>
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
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploadingImage}>
          {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar produto" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
