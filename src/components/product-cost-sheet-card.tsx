import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  onApplySuggestedPrice: (price: number) => Promise<void> | void;
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
    <TableRow>
      <TableCell className="max-w-24 truncate font-heading font-medium md:max-w-40">{item.supply.name}</TableCell>
      <TableCell className="text-right">
        {item.quantity} {item.supply.unit}
      </TableCell>
      <TableCell className="hidden text-right font-medium md:table-cell">{currencyFormatter.format(lineCost)}</TableCell>
    </TableRow>
  );
}

function RecipeDisplayRow({ item }: { item: RecipeItem }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lineCost = item.recipe.costPerYield !== null ? item.quantity * item.recipe.costPerYield : null;

  return (
    <>
      <TableRow>
        <TableCell className="max-w-24 truncate font-heading font-medium md:max-w-40">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            disabled={item.recipe.ingredients.length === 0}
            className="flex items-center gap-1 disabled:cursor-default"
          >
            {item.recipe.ingredients.length > 0 &&
              (isExpanded ? (
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              ))}
            <span className="truncate">{item.recipe.name}</span>
          </button>
        </TableCell>
        <TableCell className="text-right">
          {item.quantity} {item.recipe.yieldUnit}
        </TableCell>
        <TableCell className="hidden text-right font-medium md:table-cell">
          {lineCost !== null ? currencyFormatter.format(lineCost) : "—"}
        </TableCell>
      </TableRow>

      {isExpanded && item.recipe.ingredients.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={3} className="bg-muted/30 py-2">
            <ul className="space-y-1 pl-5 text-sm text-muted-foreground">
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

            <div className="my-2 border-t border-border pl-5" />

            <div className="flex items-center justify-between gap-3 pl-5 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {item.recipe.yieldQuantity} {item.recipe.yieldUnit} •{" "}
                {currencyFormatter.format(item.recipe.costTotal)}
              </span>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
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
  onApplySuggestedPrice,
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

  async function handleApplySuggestedPrice() {
    if (suggestedPrice === null) return;
    await onApplySuggestedPrice(Number(suggestedPrice.toFixed(2)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm text-muted-foreground">Itens da ficha técnica</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsEditItemsOpen(true)}>
          <PencilIcon />
          Editar
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Carregando ficha técnica..." />
      ) : (
        <>
          {combinedRows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedRows.map((row) =>
                    row.kind === "supply" ? (
                      <SupplyDisplayRow key={`supply-${row.item.id}`} item={row.item} />
                    ) : (
                      <RecipeDisplayRow key={`recipe-${row.item.id}`} item={row.item} />
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {combinedRows.length > 0 && (
            <div className="space-y-2 rounded-2xl border px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Custo total (CMV)</span>
                <span className="font-medium">{currencyFormatter.format(totalCost)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label htmlFor="product-multiplier" className="text-sm text-muted-foreground">
                  Multiplicador desejado
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
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Preço aplicado</span>
                <span className="font-medium">{currencyFormatter.format(productPrice)}</span>
              </div>

              {suggestedPrice !== null && priceDiff !== null && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Preço sugerido</span>
                  <div className="flex items-center gap-2">
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
                    {Math.abs(priceDiff) > 0.005 && (
                      <Button type="button" size="sm" variant="outline" onClick={handleApplySuggestedPrice}>
                        Usar este preço
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {combinedRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum insumo ou receita adicionado ainda.</p>
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
