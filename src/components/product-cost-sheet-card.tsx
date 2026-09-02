import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { ManageCatalogModal } from "@/components/manage-catalog-modal";
import { AddCostSheetItemsModal } from "@/components/add-cost-sheet-items-modal";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useUpdateProductSupply } from "@/hooks/tanstack/product-supply/use-update-product-supply";
import { useRemoveProductSupply } from "@/hooks/tanstack/product-supply/use-remove-product-supply";
import { useGetRecipes } from "@/hooks/tanstack/recipe/use-get-recipes";
import { useGetProductRecipes } from "@/hooks/tanstack/product-recipe/use-get-product-recipes";
import { useUpdateProductRecipe } from "@/hooks/tanstack/product-recipe/use-update-product-recipe";
import { useRemoveProductRecipe } from "@/hooks/tanstack/product-recipe/use-remove-product-recipe";
import { currencyFormatter, unitCostFormatter } from "@/lib/utils/formatter";

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
  supply: { id: string; name: string; unit: string; costPerUnit: number };
};

type RecipeItem = {
  id: string;
  quantity: number;
  recipe: {
    id: string;
    name: string;
    yieldQuantity: number;
    yieldUnit: string;
    costPerYield: number | null;
    ingredients: {
      id: string;
      quantity: number;
      supply: { id: string; name: string; unit: string; costPerUnit: number };
    }[];
  };
};

function SupplyLineRow({
  item,
  onUpdate,
  onRemove,
  disabled,
}: {
  item: SupplyItem;
  onUpdate: (quantity: number) => Promise<void>;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const lineCost = item.quantity * item.supply.costPerUnit;

  async function handleBlur() {
    const parsed = Number(quantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuantity(String(item.quantity));
      return;
    }
    if (parsed === item.quantity) return;
    await onUpdate(parsed);
  }

  return (
    <TableRow>
      <TableCell className="max-w-24 truncate font-heading font-medium md:max-w-40">{item.supply.name}</TableCell>
      <TableCell className="hidden text-right text-muted-foreground md:table-cell">
        {unitCostFormatter.format(item.supply.costPerUnit)} / {item.supply.unit}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-9 w-20"
            value={quantity}
            disabled={disabled}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={handleBlur}
          />
          <span className="text-sm text-muted-foreground">{item.supply.unit}</span>
        </div>
      </TableCell>
      <TableCell className="hidden text-right font-medium md:table-cell">{currencyFormatter.format(lineCost)}</TableCell>
      <TableCell>
        <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={disabled}>
          <Trash2Icon />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function RecipeLineRow({
  item,
  onUpdate,
  onRemove,
  disabled,
}: {
  item: RecipeItem;
  onUpdate: (quantity: number) => Promise<void>;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [isExpanded, setIsExpanded] = useState(false);
  const lineCost = item.recipe.costPerYield !== null ? item.quantity * item.recipe.costPerYield : null;

  async function handleBlur() {
    const parsed = Number(quantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuantity(String(item.quantity));
      return;
    }
    if (parsed === item.quantity) return;
    await onUpdate(parsed);
  }

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
        <TableCell className="hidden text-right text-muted-foreground md:table-cell">
          {item.recipe.costPerYield !== null
            ? `${currencyFormatter.format(item.recipe.costPerYield)} / ${item.recipe.yieldQuantity} ${item.recipe.yieldUnit}`
            : "—"}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              step="0.001"
              min="0"
              className="h-9 w-20"
              value={quantity}
              disabled={disabled}
              onChange={(event) => setQuantity(event.target.value)}
              onBlur={handleBlur}
            />
            <span className="text-sm text-muted-foreground">{item.recipe.yieldUnit}</span>
          </div>
        </TableCell>
        <TableCell className="hidden text-right font-medium md:table-cell">
          {lineCost !== null ? currencyFormatter.format(lineCost) : "—"}
        </TableCell>
        <TableCell>
          <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={disabled}>
            <Trash2Icon />
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && item.recipe.ingredients.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="bg-muted/30 py-2">
            <ul className="space-y-1 pl-5 text-sm text-muted-foreground">
              {item.recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{ingredient.supply.name}</span>
                  <span className="shrink-0">
                    {ingredient.quantity} {ingredient.supply.unit}
                    <span className="hidden md:inline">
                      {" "}
                      · {unitCostFormatter.format(ingredient.supply.costPerUnit)}/{ingredient.supply.unit}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

type CombinedRow =
  | { kind: "supply"; name: string; item: SupplyItem }
  | { kind: "recipe"; name: string; item: RecipeItem };

export function ProductCostSheetCard({
  productId,
  organizationId,
  productPrice,
  multiplier,
  onMultiplierChange,
  onApplySuggestedPrice,
}: ProductCostSheetCardProps) {
  const [multiplierInput, setMultiplierInput] = useState(multiplier !== null ? String(multiplier) : "");
  const [manageCatalogTab, setManageCatalogTab] = useState<"supplies" | "recipes" | null>(null);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);

  const { data: suppliesData } = useGetSupplies({ organizationId });
  const allSupplies = suppliesData?.supplies ?? [];
  const { data: productSuppliesData, isLoading: isLoadingSupplies } = useGetProductSupplies({ productId });
  const supplyItems = useMemo(() => productSuppliesData?.items ?? [], [productSuppliesData]);

  const { data: recipesData } = useGetRecipes({ organizationId });
  const allRecipes = recipesData?.recipes ?? [];
  const { data: productRecipesData, isLoading: isLoadingRecipes } = useGetProductRecipes({ productId });
  const recipeItems = useMemo(() => productRecipesData?.items ?? [], [productRecipesData]);

  const isLoading = isLoadingSupplies || isLoadingRecipes;

  const { mutateAsync: updateProductSupply } = useUpdateProductSupply({ productId });
  const { mutateAsync: removeProductSupply, isPending: isRemovingSupply } = useRemoveProductSupply({ productId });

  const { mutateAsync: updateProductRecipe } = useUpdateProductRecipe({ productId });
  const { mutateAsync: removeProductRecipe, isPending: isRemovingRecipe } = useRemoveProductRecipe({ productId });

  const isRemoving = isRemovingSupply || isRemovingRecipe;

  const availableSupplies = useMemo(() => {
    const usedIds = new Set(supplyItems.map((item) => item.supply.id));
    return allSupplies.filter((supply) => !usedIds.has(supply.id));
  }, [allSupplies, supplyItems]);

  const availableRecipes = useMemo(() => {
    const usedIds = new Set(recipeItems.map((item) => item.recipe.id));
    return allRecipes.filter((recipe) => !usedIds.has(recipe.id));
  }, [allRecipes, recipeItems]);

  const combinedRows = useMemo(() => {
    const rows: CombinedRow[] = [
      ...supplyItems.map((item): CombinedRow => ({ kind: "supply", name: item.supply.name, item })),
      ...recipeItems.map((item): CombinedRow => ({ kind: "recipe", name: item.recipe.name, item })),
    ];
    return rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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

  async function handleUpdateSupply(id: string, quantity: number) {
    try {
      await updateProductSupply({ id, quantity });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar insumo.");
    }
  }

  async function handleRemoveSupply(id: string) {
    try {
      await removeProductSupply({ id, productId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover insumo.");
    }
  }

  async function handleUpdateRecipe(id: string, quantity: number) {
    try {
      await updateProductRecipe({ id, quantity });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar receita.");
    }
  }

  async function handleRemoveRecipe(id: string) {
    try {
      await removeProductRecipe({ id, productId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover receita.");
    }
  }

  const hasCatalog = allSupplies.length > 0 || allRecipes.length > 0;
  const hasAvailable = availableSupplies.length > 0 || availableRecipes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm text-muted-foreground">Itens da ficha técnica</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setManageCatalogTab("supplies")}>
          <SettingsIcon />
          Gerenciar
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
                    <TableHead>Item</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Custo/unidade</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Custo</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedRows.map((row) =>
                    row.kind === "supply" ? (
                      <SupplyLineRow
                        key={`supply-${row.item.id}`}
                        item={row.item}
                        disabled={isRemoving}
                        onUpdate={(quantity) => handleUpdateSupply(row.item.id, quantity)}
                        onRemove={() => handleRemoveSupply(row.item.id)}
                      />
                    ) : (
                      <RecipeLineRow
                        key={`recipe-${row.item.id}`}
                        item={row.item}
                        disabled={isRemoving}
                        onUpdate={(quantity) => handleUpdateRecipe(row.item.id, quantity)}
                        onRemove={() => handleRemoveRecipe(row.item.id)}
                      />
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

          {!hasCatalog ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem insumos nem receitas cadastrados.{" "}
              <button
                type="button"
                onClick={() => setManageCatalogTab("supplies")}
                className="underline underline-offset-4"
              >
                Cadastre um insumo
              </button>{" "}
              ou{" "}
              <button
                type="button"
                onClick={() => setManageCatalogTab("recipes")}
                className="underline underline-offset-4"
              >
                uma receita
              </button>{" "}
              para adicionar aqui.
            </p>
          ) : !hasAvailable ? (
            <p className="text-sm text-muted-foreground">Todos os insumos e receitas cadastrados já foram adicionados.</p>
          ) : (
            <Button type="button" variant="outline" onClick={() => setIsAddItemsOpen(true)}>
              <PlusIcon />
              Adicionar item
            </Button>
          )}
        </>
      )}

      <ManageCatalogModal
        isOpen={manageCatalogTab !== null}
        organizationId={organizationId}
        defaultTab={manageCatalogTab ?? undefined}
        onClose={() => setManageCatalogTab(null)}
      />

      <AddCostSheetItemsModal
        isOpen={isAddItemsOpen}
        productId={productId}
        availableSupplies={availableSupplies}
        availableRecipes={availableRecipes}
        onClose={() => setIsAddItemsOpen(false)}
      />
    </div>
  );
}
