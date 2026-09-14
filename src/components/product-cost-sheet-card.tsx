import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { EditCostSheetItemsModal } from "@/components/edit-cost-sheet-items-modal";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useGetProductRecipes } from "@/hooks/tanstack/product-recipe/use-get-product-recipes";
import { currencyFormatter } from "@/lib/utils/formatter";

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

function SupplyDisplayRow({ item }: { item: SupplyItem }) {
  const lineCost = item.quantity * item.supply.costPerUnit;

  return (
    <div className="flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1 truncate font-heading font-medium">{item.supply.name}</div>
      <div className="shrink-0 text-right text-sm">
        <span className="text-muted-foreground">{item.quantity} {item.supply.unit} •</span> {currencyFormatter.format(lineCost)}
      </div>
    </div>
  );
}

function RecipeDisplayRow({ item }: { item: RecipeItem }) {
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
          <span className="truncate font-heading font-medium">{item.recipe.name}</span>
        </button>
        <div className="shrink-0 text-right text-sm">
          <span className="text-muted-foreground">{item.quantity} {item.recipe.yieldUnit} •</span> {lineCost !== null ? currencyFormatter.format(lineCost) : "—"}
        </div>
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
  const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);

  const { data: productSuppliesData, isLoading: isLoadingSupplies } = useGetProductSupplies({ productId });
  const supplyItems = useMemo(() => productSuppliesData?.items ?? [], [productSuppliesData]);

  const { data: productRecipesData, isLoading: isLoadingRecipes } = useGetProductRecipes({ productId });
  const recipeItems = useMemo(() => productRecipesData?.items ?? [], [productRecipesData]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {!isLoading && combinedRows.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditItemsOpen(true)}>
            <PencilIcon />
            Editar
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Carregando ficha técnica..." />
      ) : (
        <>
          {combinedRows.length > 0 && (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
              {combinedRows.map((row) =>
                row.kind === "supply" ? (
                  <SupplyDisplayRow key={`supply-${row.item.id}`} item={row.item} />
                ) : (
                  <RecipeDisplayRow key={`recipe-${row.item.id}`} item={row.item} />
                ),
              )}
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
                <Button size="sm" onClick={() => setIsEditItemsOpen(true)}>
                  <PlusIcon />
                  Adicionar
                </Button>
              </EmptyState.Action>
            </EmptyState>
          )}
        </>
      )}

      <EditCostSheetItemsModal
        isOpen={isEditItemsOpen}
        productId={productId}
        organizationId={organizationId}
        onClose={() => setIsEditItemsOpen(false)}
      />
    </div>
  );
}
