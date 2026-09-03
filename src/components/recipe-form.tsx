import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemGroup, ItemTitle } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplyForm, type SupplyFormValues } from "@/components/supply-form";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useCreateSupply } from "@/hooks/tanstack/supply/use-create-supply";
import { useGetRecipeSupplies } from "@/hooks/tanstack/recipe-supply/use-get-recipe-supplies";
import { useAddRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-add-recipe-supply";
import { useUpdateRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-update-recipe-supply";
import { useRemoveRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-remove-recipe-supply";
import { useCreateRecipe } from "@/hooks/tanstack/recipe/use-create-recipe";
import { useUpdateRecipe } from "@/hooks/tanstack/recipe/use-update-recipe";
import { useDeleteRecipe } from "@/hooks/tanstack/recipe/use-delete-recipe";
import { UNIT_OPTIONS } from "@/lib/constants/units";
import { normalize } from "@/lib/utils";

export const recipeFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome da receita."),
  yieldQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  yieldUnit: z.string().min(1, "Selecione a unidade de medida."),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

type RecipeSummary = { id: string; name: string; yieldQuantity: number; yieldUnit: string };

type RecipeFormProps = {
  organizationId: string;
  mode: "create" | "edit";
  recipe?: RecipeSummary | null;
  onCancel: () => void;
  onSubViewChange?: (meta: { title: string; onCancel: () => void } | null) => void;
};

function getDefaultValues(recipe?: RecipeSummary | null): RecipeFormValues {
  return {
    name: recipe?.name ?? "",
    yieldQuantity: recipe?.yieldQuantity ?? 0,
    yieldUnit: recipe?.yieldUnit ?? "",
  };
}

export function RecipeForm({ organizationId, mode, recipe, onCancel, onSubViewChange }: RecipeFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: getDefaultValues(recipe),
  });

  const recipeId = recipe?.id ?? "";

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [hasSeeded, setHasSeeded] = useState(mode === "create");
  const [supplySearch, setSupplySearch] = useState("");
  const [subView, setSubView] = useState<"recipe" | "create-supply">("recipe");

  useEffect(() => {
    onSubViewChange?.(subView === "create-supply" ? { title: "Novo insumo", onCancel: () => setSubView("recipe") } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView, onSubViewChange]);

  const { data: suppliesData, isLoading: isLoadingSupplies } = useGetSupplies({ organizationId });
  const allSupplies = useMemo(() => suppliesData?.supplies ?? [], [suppliesData]);

  const filteredSupplies = useMemo(() => {
    const term = normalize(supplySearch.trim());
    if (!term) return allSupplies;
    return allSupplies.filter((supply) => normalize(supply.name).includes(term));
  }, [allSupplies, supplySearch]);

  const { data: existingData, isLoading: isLoadingExisting } = useGetRecipeSupplies({ recipeId });
  const existingItems = useMemo(() => existingData?.items ?? [], [existingData]);

  useEffect(() => {
    if (hasSeeded || mode !== "edit" || !existingData) return;
    const seed: Record<string, string> = {};
    for (const item of existingData.items) {
      seed[item.supply.id] = String(item.quantity);
    }
    setSelected(seed);
    setHasSeeded(true);
  }, [hasSeeded, mode, existingData]);

  const { mutateAsync: createRecipe, isPending: isCreating } = useCreateRecipe();
  const { mutateAsync: updateRecipe, isPending: isUpdating } = useUpdateRecipe({ organizationId });
  const { mutateAsync: addRecipeSupply } = useAddRecipeSupply({ recipeId, organizationId });
  const { mutateAsync: updateRecipeSupply } = useUpdateRecipeSupply({ recipeId, organizationId });
  const { mutateAsync: removeRecipeSupply } = useRemoveRecipeSupply({ recipeId, organizationId });
  const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe({ organizationId });
  const { mutateAsync: createSupply, isPending: isCreatingSupply } = useCreateSupply();
  const isSubmitting = isCreating || isUpdating;

  function toggleSupply(supplyId: string) {
    setSelected((prev) => {
      if (supplyId in prev) {
        const next = { ...prev };
        delete next[supplyId];
        return next;
      }
      return { ...prev, [supplyId]: "" };
    });
  }

  function setSupplyQuantity(supplyId: string, quantity: string) {
    setSelected((prev) => (supplyId in prev ? { ...prev, [supplyId]: quantity } : prev));
  }

  async function onSubmit(values: RecipeFormValues) {
    for (const quantity of Object.values(selected)) {
      const parsed = Number(quantity.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error("Informe uma quantidade válida para todos os insumos selecionados.");
        return;
      }
    }

    try {
      let id: string;
      if (mode === "edit" && recipe) {
        await updateRecipe({ id: recipe.id, organizationId, ...values });
        id = recipe.id;
      } else {
        const created = await createRecipe({ organizationId, ...values });
        id = created.id;
      }

      const existingBySupplyId = new Map(existingItems.map((item) => [item.supply.id, item]));
      const writes: Promise<unknown>[] = [];

      for (const [supplyId, quantityInput] of Object.entries(selected)) {
        const quantity = Number(quantityInput.replace(",", "."));
        const existing = existingBySupplyId.get(supplyId);
        if (existing) {
          if (existing.quantity !== quantity) {
            writes.push(updateRecipeSupply({ id: existing.id, quantity }));
          }
          existingBySupplyId.delete(supplyId);
        } else {
          writes.push(addRecipeSupply({ recipeId: id, supplyId, quantity }));
        }
      }

      for (const remaining of existingBySupplyId.values()) {
        writes.push(removeRecipeSupply({ id: remaining.id, recipeId: id }));
      }

      await Promise.all(writes);

      toast.success(mode === "create" ? "Receita criada com sucesso." : "Receita atualizada com sucesso.");
      onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar receita.");
    }
  }

  async function handleCreateSupply(values: SupplyFormValues) {
    try {
      const created = await createSupply({ organizationId, ...values });
      toast.success("Insumo criado com sucesso.");
      setSelected((prev) => ({ ...prev, [created.id]: "" }));
      setSubView("recipe");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar insumo.");
    }
  }

  async function handleDelete() {
    if (!recipe) return;
    const confirmed = window.confirm(
      `Deseja realmente excluir a receita "${recipe.name}"? Ela será removida da ficha técnica dos produtos vinculados.`,
    );
    if (!confirmed) return;

    try {
      await deleteRecipe({ id: recipe.id, organizationId });
      toast.success("Receita excluída com sucesso.");
      onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir receita.");
    }
  }

  const isLoadingIngredients = isLoadingSupplies || (mode === "edit" && isLoadingExisting);

  if (subView === "create-supply") {
    return (
      <SupplyForm
        mode="create"
        isSubmitting={isCreatingSupply}
        onCancel={() => setSubView("recipe")}
        onSubmit={handleCreateSupply}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel>Nome</FieldLabel>
          <Input type="text" placeholder="Ex: Massa de cenoura" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Rendimento</FieldLabel>
            <Input
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              {...register("yieldQuantity", { valueAsNumber: true })}
            />
            <FieldError>{errors.yieldQuantity?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Unidade</FieldLabel>
            <Controller
              name="yieldUnit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.yieldUnit?.message}</FieldError>
          </Field>
        </div>
      </FieldGroup>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground">Insumos</h4>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSubView("create-supply")}
            aria-label="Novo insumo"
          >
            <PlusIcon />
          </Button>
        </div>

        {!isLoadingIngredients && allSupplies.length > 0 && (
          <Input
            type="search"
            value={supplySearch}
            onChange={(event) => setSupplySearch(event.target.value)}
            placeholder="Buscar insumo"
          />
        )}

        {isLoadingIngredients ? (
          <LoadingState label="Carregando insumos..." />
        ) : allSupplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não tem insumos cadastrados.</p>
        ) : filteredSupplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum insumo encontrado para "{supplySearch}".</p>
        ) : (
          <ItemGroup>
            {filteredSupplies.map((supply) => {
              const quantity = selected[supply.id];
              const isChecked = quantity !== undefined;
              return (
                <Item key={supply.id} variant="outline" size="sm">
                  <Checkbox
                    id={`recipe-supply-${supply.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleSupply(supply.id)}
                  />
                  <label htmlFor={`recipe-supply-${supply.id}`} className="flex flex-1 cursor-pointer flex-col">
                    <ItemTitle>{supply.name}</ItemTitle>
                  </label>
                  {isChecked && (
                    <ItemActions>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Qtd."
                        autoFocus
                        className="h-8 w-20"
                        value={quantity}
                        onChange={(event) => setSupplyQuantity(supply.id, event.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">{supply.unit}</span>
                    </ItemActions>
                  )}
                </Item>
              );
            })}
          </ItemGroup>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-2 border-t border-border bg-popover px-5 pt-3 pb-1">
        <div>
          {mode === "edit" && recipe && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              Excluir
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar receita" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </form>
  );
}
