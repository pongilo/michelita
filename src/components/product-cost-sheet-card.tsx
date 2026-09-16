import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronRightIcon, NotebookIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { EditCostSheetItemsModal } from "@/components/edit-cost-sheet-items-modal";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useUpdateProductSupply } from "@/hooks/tanstack/product-supply/use-update-product-supply";
import { useRemoveProductSupply } from "@/hooks/tanstack/product-supply/use-remove-product-supply";
import { useGetProductRecipes } from "@/hooks/tanstack/product-recipe/use-get-product-recipes";
import { useUpdateProductRecipe } from "@/hooks/tanstack/product-recipe/use-update-product-recipe";
import { useRemoveProductRecipe } from "@/hooks/tanstack/product-recipe/use-remove-product-recipe";
import { cn } from "@/lib/utils";
import { currencyFormatter } from "@/lib/utils/formatter";

function parseQuantityInput(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type ProductCostSheetCardProps = {
  productId: string;
  organizationId: string;
  productPrice: number;
  multiplier: number | null;
  onMultiplierChange: (multiplier: number | null) => Promise<void> | void;
};

type SupplyItem = {
  id: string;
  quantity: number;
  supply: { id: string; name: string; unit: string; costPerUnit: number; isIngredient: boolean };
};

type RecipeItem = {
  id: string;
  quantity: number;
  recipe: {
    id: string;
    name: string;
    yieldQuantity: number;
    yieldUnit: string;
    costTotal: number;
    costPerYield: number | null;
    ingredients: {
      id: string;
      quantity: number;
      supply: { id: string; name: string; unit: string; costPerUnit: number };
    }[];
  };
};

function SupplyDisplayRow({
  item,
  isEditing,
  quantityValue,
  onQuantityChange,
  isMarkedForRemoval,
  onToggleRemove,
}: {
  item: SupplyItem;
  isEditing: boolean;
  quantityValue: string;
  onQuantityChange: (value: string) => void;
  isMarkedForRemoval: boolean;
  onToggleRemove: () => void;
}) {
  const lineCost = item.quantity * item.supply.costPerUnit;

  return (
    <div className="flex items-center gap-2 p-3">
      <div
        className={cn(
          "min-w-0 flex-1 truncate font-heading font-medium",
          isMarkedForRemoval && "text-muted-foreground line-through",
        )}
      >
        {item.supply.name}
      </div>
      {isEditing ? (
        isMarkedForRemoval ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleRemove} aria-label="Desfazer remoção">
            <RotateCcwIcon />
          </Button>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-1">
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="Qtd."
                className="h-8 w-20"
                value={quantityValue}
                onChange={(event) => onQuantityChange(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">{item.supply.unit}</span>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleRemove} aria-label="Remover item">
              <Trash2Icon />
            </Button>
          </>
        )
      ) : (
        <div className="shrink-0 text-right text-sm">
          <span className="text-muted-foreground">
            {item.quantity} {item.supply.unit} •
          </span>{" "}
          {currencyFormatter.format(lineCost)}
        </div>
      )}
    </div>
  );
}

function RecipeDisplayRow({
  item,
  isEditing,
  quantityValue,
  onQuantityChange,
  isMarkedForRemoval,
  onToggleRemove,
}: {
  item: RecipeItem;
  isEditing: boolean;
  quantityValue: string;
  onQuantityChange: (value: string) => void;
  isMarkedForRemoval: boolean;
  onToggleRemove: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lineCost = item.recipe.costPerYield !== null ? item.quantity * item.recipe.costPerYield : null;
  const hasIngredients = item.recipe.ingredients.length > 0;

  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          disabled={!hasIngredients}
          className="flex min-w-0 flex-1 items-center gap-1 disabled:cursor-default"
        >
          {hasIngredients &&
            (isExpanded ? (
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            ))}
          <span
            className={cn(
              "truncate font-heading font-medium",
              isMarkedForRemoval && "text-muted-foreground line-through",
            )}
          >
            {item.recipe.name}
          </span>
        </button>
        {isEditing ? (
          isMarkedForRemoval ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleRemove} aria-label="Desfazer remoção">
              <RotateCcwIcon />
            </Button>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-1">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Qtd."
                  className="h-8 w-20"
                  value={quantityValue}
                  onChange={(event) => onQuantityChange(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">{item.recipe.yieldUnit}</span>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleRemove} aria-label="Remover item">
                <Trash2Icon />
              </Button>
            </>
          )
        ) : (
          <div className="shrink-0 text-right text-sm">
            <span className="text-muted-foreground">
              {item.quantity} {item.recipe.yieldUnit} •
            </span>{" "}
            {lineCost !== null ? currencyFormatter.format(lineCost) : "—"}
          </div>
        )}
      </div>

      {isExpanded && hasIngredients && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 text-sm">
          <ul className="space-y-1 text-muted-foreground">
            {item.recipe.ingredients.map((ingredient) => {
              const ingredientCost = ingredient.quantity * ingredient.supply.costPerUnit;
              return (
                <li key={ingredient.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{ingredient.supply.name}</span>
                  <span className="shrink-0">
                    {ingredient.quantity} {ingredient.supply.unit}
                    {" · "}
                    <span className="font-medium text-foreground">
                      {currencyFormatter.format(ingredientCost)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">
              {item.recipe.yieldQuantity} {item.recipe.yieldUnit} •{" "}
              {currencyFormatter.format(item.recipe.costTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type CombinedRow =
  | { kind: "supply"; name: string; item: SupplyItem }
  | { kind: "recipe"; name: string; item: RecipeItem };

function getCategoryRank(row: CombinedRow): number {
  if (row.kind === "recipe") return 0;
  return row.item.supply.isIngredient ? 1 : 2;
}

export function ProductCostSheetCard({
  productId,
  organizationId,
  productPrice,
  multiplier,
  onMultiplierChange,
}: ProductCostSheetCardProps) {
  const [multiplierInput, setMultiplierInput] = useState(multiplier !== null ? String(multiplier) : "");
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isEditingQuantities, setIsEditingQuantities] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, string>>({});
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const [isSavingQuantities, setIsSavingQuantities] = useState(false);

  const { data: productSuppliesData, isLoading: isLoadingSupplies } = useGetProductSupplies({ productId });
  const supplyItems = useMemo(() => productSuppliesData?.items ?? [], [productSuppliesData]);

  const { data: productRecipesData, isLoading: isLoadingRecipes } = useGetProductRecipes({ productId });
  const recipeItems = useMemo(() => productRecipesData?.items ?? [], [productRecipesData]);

  const { mutateAsync: updateProductSupply } = useUpdateProductSupply({ productId });
  const { mutateAsync: updateProductRecipe } = useUpdateProductRecipe({ productId });
  const { mutateAsync: removeProductSupply } = useRemoveProductSupply({ productId });
  const { mutateAsync: removeProductRecipe } = useRemoveProductRecipe({ productId });

  const isLoading = isLoadingSupplies || isLoadingRecipes;

  const combinedRows = useMemo(() => {
    const rows: CombinedRow[] = [
      ...supplyItems.map((item): CombinedRow => ({ kind: "supply", name: item.supply.name, item })),
      ...recipeItems.map((item): CombinedRow => ({ kind: "recipe", name: item.recipe.name, item })),
    ];
    return rows.sort((a, b) => {
      const categoryDiff = getCategoryRank(a) - getCategoryRank(b);
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [supplyItems, recipeItems]);

  const supplyCost = supplyItems.reduce((sum, item) => sum + item.quantity * item.supply.costPerUnit, 0);
  const recipeCost = recipeItems.reduce(
    (sum, item) => sum + (item.recipe.costPerYield !== null ? item.quantity * item.recipe.costPerYield : 0),
    0,
  );
  const totalCost = supplyCost + recipeCost;
  const suggestedPrice = multiplier !== null && totalCost > 0 ? totalCost * multiplier : null;
  const priceDiff = suggestedPrice !== null ? suggestedPrice - productPrice : null;

  useEffect(() => {
    setMultiplierInput(multiplier !== null ? String(multiplier) : "");
  }, [multiplier]);

  useEffect(() => {
    if (!isEditingQuantities) return;
    setEditedQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of combinedRows) {
        const key = `${row.kind}:${row.item.id}`;
        if (!(key in next)) {
          next[key] = String(row.item.quantity);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [combinedRows, isEditingQuantities]);

  async function handleMultiplierBlur() {
    const trimmed = multiplierInput.trim();
    if (trimmed === "") {
      if (multiplier === null) return;
      await onMultiplierChange(null);
      return;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMultiplierInput(multiplier !== null ? String(multiplier) : "");
      return;
    }
    if (parsed === multiplier) return;
    await onMultiplierChange(parsed);
  }

  function handleStartEditQuantities() {
    const seed: Record<string, string> = {};
    for (const row of combinedRows) {
      seed[`${row.kind}:${row.item.id}`] = String(row.item.quantity);
    }
    setEditedQuantities(seed);
    setIsEditingQuantities(true);
  }

  function handleCancelEditQuantities() {
    setEditedQuantities({});
    setPendingRemovals(new Set());
    setIsEditingQuantities(false);
  }

  function handleToggleRemove(key: string) {
    setPendingRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSaveQuantities() {
    const writes: Promise<unknown>[] = [];

    for (const row of combinedRows) {
      const key = `${row.kind}:${row.item.id}`;

      if (pendingRemovals.has(key)) {
        if (row.kind === "supply") {
          writes.push(removeProductSupply({ id: row.item.id, productId }));
        } else {
          writes.push(removeProductRecipe({ id: row.item.id, productId }));
        }
        continue;
      }

      const parsed = parseQuantityInput(editedQuantities[key] ?? "");
      if (parsed === null) {
        toast.error("Informe uma quantidade válida para todos os itens.");
        return;
      }
      if (parsed === row.item.quantity) continue;
      if (row.kind === "supply") {
        writes.push(updateProductSupply({ id: row.item.id, quantity: parsed }));
      } else {
        writes.push(updateProductRecipe({ id: row.item.id, quantity: parsed }));
      }
    }

    setIsSavingQuantities(true);
    try {
      await Promise.all(writes);
      toast.success("Ficha técnica atualizada com sucesso.");
      setIsEditingQuantities(false);
      setEditedQuantities({});
      setPendingRemovals(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar alterações.");
    } finally {
      setIsSavingQuantities(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!isLoading && combinedRows.length > 0 && !isEditingQuantities && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddItemsOpen(true)}>
              <NotebookIcon />
              Receitas e insumos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleStartEditQuantities}>
              <PencilIcon />
              Editar
            </Button>
          </>
        )}

        {isEditingQuantities && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelEditQuantities}
              disabled={isSavingQuantities}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSaveQuantities} disabled={isSavingQuantities}>
              {isSavingQuantities ? "Salvando..." : "Salvar"}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Carregando ficha técnica..." />
      ) : (
        <>
          {combinedRows.length > 0 && (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
              {combinedRows.map((row) => {
                const key = `${row.kind}:${row.item.id}`;
                return row.kind === "supply" ? (
                  <SupplyDisplayRow
                    key={key}
                    item={row.item}
                    isEditing={isEditingQuantities}
                    quantityValue={editedQuantities[key] ?? ""}
                    onQuantityChange={(value) => setEditedQuantities((prev) => ({ ...prev, [key]: value }))}
                    isMarkedForRemoval={pendingRemovals.has(key)}
                    onToggleRemove={() => handleToggleRemove(key)}
                  />
                ) : (
                  <RecipeDisplayRow
                    key={key}
                    item={row.item}
                    isEditing={isEditingQuantities}
                    quantityValue={editedQuantities[key] ?? ""}
                    onQuantityChange={(value) => setEditedQuantities((prev) => ({ ...prev, [key]: value }))}
                    isMarkedForRemoval={pendingRemovals.has(key)}
                    onToggleRemove={() => handleToggleRemove(key)}
                  />
                );
              })}
            </div>
          )}

          {combinedRows.length > 0 && (
            <div className="space-y-2 rounded-2xl border px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Custo total</span>
                <span className="font-medium">{currencyFormatter.format(totalCost)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label htmlFor="product-multiplier" className="text-sm text-muted-foreground">
                  Multiplicador
                </label>
                <div className="flex items-center gap-1">
                  <Input
                    id="product-multiplier"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="h-9 w-20 text-right"
                    value={multiplierInput}
                    onChange={(event) => setMultiplierInput(event.target.value)}
                    onBlur={handleMultiplierBlur}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Preço aplicado</span>
                <span className="font-medium">{currencyFormatter.format(productPrice)}</span>
              </div>

              {suggestedPrice !== null && priceDiff !== null && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Preço sugerido</span>
                  <span className="font-medium">
                    {currencyFormatter.format(suggestedPrice)}
                    {Math.abs(priceDiff) > 0.005 && (
                      <span className={priceDiff > 0 ? "text-amber-700" : "text-muted-foreground"}>
                        {" "}
                        ({priceDiff > 0 ? "+" : "-"}
                        {currencyFormatter.format(Math.abs(priceDiff))})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {combinedRows.length === 0 && (
            <EmptyState compact>
              <EmptyState.Icon>🧾</EmptyState.Icon>
              <EmptyState.Title>Nenhum item na ficha técnica</EmptyState.Title>
              <EmptyState.Description>
                Adicione os insumos ou receitas usados neste produto para calcular o custo automaticamente.
              </EmptyState.Description>
              <EmptyState.Action>
                <Button size="sm" onClick={() => setIsAddItemsOpen(true)}>
                  <PlusIcon />
                  Adicionar
                </Button>
              </EmptyState.Action>
            </EmptyState>
          )}
        </>
      )}

      <EditCostSheetItemsModal
        isOpen={isAddItemsOpen}
        productId={productId}
        organizationId={organizationId}
        onClose={() => setIsAddItemsOpen(false)}
      />
    </div>
  );
}
