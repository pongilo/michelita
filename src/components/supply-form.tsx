import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { unitCostFormatter } from "@/lib/utils/formatter";
import { UNIT_OPTIONS } from "@/lib/constants/units";

export const supplyFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do insumo."),
  unit: z.string().min(1, "Selecione a unidade de medida."),
  purchasePrice: z.number({ error: "Informe um preço válido." }).positive("O preço deve ser maior que zero."),
  purchaseQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  isIngredient: z.boolean(),
});

export type SupplyFormValues = z.infer<typeof supplyFormSchema>;

type SupplyFormProps = {
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<SupplyFormValues>;
  defaultIsIngredient?: boolean;
  onCancel: () => void;
  onSubmit: (values: SupplyFormValues) => Promise<void> | void;
};

function getDefaultValues(
  initialValues?: Partial<SupplyFormValues>,
  defaultIsIngredient = true,
): SupplyFormValues {
  return {
    name: initialValues?.name ?? "",
    unit: initialValues?.unit ?? "",
    purchasePrice: initialValues?.purchasePrice ?? 0,
    purchaseQuantity: initialValues?.purchaseQuantity ?? 0,
    isIngredient: initialValues?.isIngredient ?? defaultIsIngredient,
  };
}

export function SupplyForm({
  mode,
  isSubmitting,
  initialValues,
  defaultIsIngredient,
  onCancel,
  onSubmit,
}: SupplyFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SupplyFormValues>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: getDefaultValues(initialValues, defaultIsIngredient),
  });

  const purchasePrice = watch("purchasePrice");
  const purchaseQuantity = watch("purchaseQuantity");
  const unit = watch("unit");
  const costPerUnit = purchasePrice > 0 && purchaseQuantity > 0 ? purchasePrice / purchaseQuantity : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <FieldGroup>
        <Field>
          <FieldLabel>Nome</FieldLabel>
          <Input type="text" placeholder="Ex: Farinha de trigo" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Preço da compra (R$)</FieldLabel>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            {...register("purchasePrice", { valueAsNumber: true })}
          />
          <FieldError>{errors.purchasePrice?.message}</FieldError>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Quantidade</FieldLabel>
            <Input
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              {...register("purchaseQuantity", { valueAsNumber: true })}
            />
            <FieldError>{errors.purchaseQuantity?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Unidade</FieldLabel>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Tabs value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                  <TabsList>
                    {UNIT_OPTIONS.map((option) => (
                      <TabsTrigger key={option} value={option} className="flex-1">
                        {option}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            />
            <FieldError>{errors.unit?.message}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel>Custo por unidade</FieldLabel>
          <div className="rounded-2xl border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {costPerUnit !== null
              ? `${unitCostFormatter.format(costPerUnit)} / ${unit?.trim() || "unidade"}`
              : "Informe o preço e a quantidade da compra"}
          </div>
          <FieldDescription>Calculado automaticamente a partir do preço e da quantidade comprada.</FieldDescription>
        </Field>

        <Field orientation="horizontal">
          <Controller
            name="isIngredient"
            control={control}
            render={({ field }) => (
              <Checkbox id="supply-is-ingredient" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="supply-is-ingredient">É um ingrediente</Label>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar insumo" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
