import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistItem, ChecklistList } from "@/components/ui/checklist-item";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplyForm, type SupplyFormValues } from "@/components/supply-form";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useCreateSupply } from "@/hooks/tanstack/supply/use-create-supply";
import { useGetRecipeSupplies } from "@/hooks/tanstack/recipe-supply/use-get-recipe-supplies";
import { useAddRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-add-recipe-supply";
import { useUpdateRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-update-recipe-supply";
import { useRemoveRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-remove-recipe-supply";
import { useCreateRecipe } from "@/hooks/tanstack/recipe/use-create-recipe";
import { useUpdateRecipe } from "@/hooks/tanstack/recipe/use-update-recipe";
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
  const [showOnlySelected, setShowOnlySelected] = useState(mode === "edit");
  const [subView, setSubView] = useState<"recipe" | "create-supply">("recipe");

  useEffect(() => {
    onSubViewChange?.(
      subView === "create-supply" ? { title: "Novo ingrediente", onCancel: () => setSubView("recipe") } : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView, onSubViewChange]);

  const { data: suppliesData, isLoading: isLoadingSupplies } = useGetSupplies({ organizationId });
  const allSupplies = useMemo(
    () => (suppliesData?.supplies ?? []).filter((supply) => supply.isIngredient),
    [suppliesData],
  );

  const filteredSupplies = useMemo(() => {
    const term = normalize(supplySearch.trim());
    let list = allSupplies;
    if (term) list = list.filter((supply) => normalize(supply.name).includes(term));
    if (showOnlySelected) list = list.filter((supply) => supply.id in selected);
    return list;
  }, [allSupplies, supplySearch, showOnlySelected, selected]);

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

  const isLoadingIngredients = isLoadingSupplies || (mode === "edit" && (isLoadingExisting || !hasSeeded));

  if (subView === "create-supply") {
    return (
      <SupplyForm
        mode="create"
        isSubmitting={isCreatingSupply}
        defaultIsIngredient
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
            <FieldError>{errors.yieldUnit?.message}</FieldError>
          </Field>
        </div>
      </FieldGroup>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Ingredientes</h4>

        {!isLoadingIngredients && (
          <div className="flex items-center gap-2">
            <Input
              type="search"
              value={supplySearch}
              onChange={(event) => setSupplySearch(event.target.value)}
              placeholder="Buscar ingrediente"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setSubView("create-supply")}
              aria-label="Novo ingrediente"
            >
              <PlusIcon />
            </Button>
          </div>
        )}

        {!isLoadingIngredients && allSupplies.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="recipe-only-selected"
              checked={showOnlySelected}
              onCheckedChange={(checked) => setShowOnlySelected(!!checked)}
            />
            <Label htmlFor="recipe-only-selected" className="cursor-pointer text-sm text-muted-foreground">
              Filtrar selecionados ({Object.keys(selected).length})
            </Label>
          </div>
        )}

        {isLoadingIngredients ? (
          <LoadingState label="Carregando ingredientes..." />
        ) : allSupplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não tem ingredientes cadastrados.</p>
        ) : filteredSupplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {supplySearch
              ? `Nenhum ingrediente encontrado para "${supplySearch}".`
              : "Nenhum ingrediente selecionado."}
          </p>
        ) : (
          <div className="-mx-5">
            <ChecklistList>
              {filteredSupplies.map((supply) => {
                const quantity = selected[supply.id];
                const isChecked = quantity !== undefined;
                return (
                  <ChecklistItem key={supply.id} selected={isChecked}>
                    <ChecklistItem.Row>
                      <Checkbox
                        id={`recipe-supply-${supply.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleSupply(supply.id)}
                      />
                      <ChecklistItem.Label htmlFor={`recipe-supply-${supply.id}`} title={supply.name} />
                      {isChecked && (
                        <ChecklistItem.Quantity
                          value={quantity}
                          unit={supply.unit}
                          onChange={(value) => setSupplyQuantity(supply.id, value)}
                        />
                      )}
                    </ChecklistItem.Row>
                  </ChecklistItem>
                );
              })}
            </ChecklistList>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t border-border bg-popover px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar receita" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
