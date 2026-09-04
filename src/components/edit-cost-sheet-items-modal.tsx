import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, MoreVerticalIcon, PlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuppliesManager } from "@/components/supplies-manager";
import { RecipesManager } from "@/components/recipes-manager";
import { normalize } from "@/lib/utils";
import { currencyFormatter } from "@/lib/utils/formatter";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useDeleteSupply } from "@/hooks/tanstack/supply/use-delete-supply";
import { useUpdateSupply } from "@/hooks/tanstack/supply/use-update-supply";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useAddProductSupply } from "@/hooks/tanstack/product-supply/use-add-product-supply";
import { useUpdateProductSupply } from "@/hooks/tanstack/product-supply/use-update-product-supply";
import { useRemoveProductSupply } from "@/hooks/tanstack/product-supply/use-remove-product-supply";
import { useGetRecipes } from "@/hooks/tanstack/recipe/use-get-recipes";
import { useDeleteRecipe } from "@/hooks/tanstack/recipe/use-delete-recipe";
import { useGetProductRecipes } from "@/hooks/tanstack/product-recipe/use-get-product-recipes";
import { useAddProductRecipe } from "@/hooks/tanstack/product-recipe/use-add-product-recipe";
import { useUpdateProductRecipe } from "@/hooks/tanstack/product-recipe/use-update-product-recipe";
import { useRemoveProductRecipe } from "@/hooks/tanstack/product-recipe/use-remove-product-recipe";

type ItemType = "supply" | "recipe";
type SelectionEntry = { type: ItemType; quantity: string };
type CatalogTarget = "recipes" | "ingredients" | "others";
type CatalogFormMeta = { title: string; onCancel: () => void };

type EditCostSheetItemsModalProps = {
  isOpen: boolean;
  productId: string;
  organizationId: string;
  onClose: () => void;
};

type SupplyOption = {
  id: string;
  name: string;
  unit: string;
  purchasePrice: number;
  purchaseQuantity: number;
  costPerUnit: number;
  isIngredient: boolean;
};

function SupplyChecklistRow({
  supply,
  entry,
  onToggle,
  onQuantityChange,
  onEditSupply,
  onDeleteSupply,
  isDeleting,
  onMoveSupply,
  isMoving,
}: {
  supply: SupplyOption;
  entry: SelectionEntry | undefined;
  onToggle: () => void;
  onQuantityChange: (quantity: string) => void;
  onEditSupply: (supply: SupplyOption) => void;
  onDeleteSupply: (supply: SupplyOption) => void;
  isDeleting: boolean;
  onMoveSupply: (supply: SupplyOption) => void;
  isMoving: boolean;
}) {
  const key = `supply:${supply.id}`;

  return (
    <TableRow>
      <TableCell className="w-0">
        <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell className="max-w-32 truncate sm:max-w-none">
        <label htmlFor={`edit-item-${key}`} className="flex cursor-pointer items-baseline gap-2">
          <span className="truncate font-heading font-medium">{supply.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {supply.purchaseQuantity} {supply.unit} • {currencyFormatter.format(supply.purchasePrice)}
          </span>
        </label>
      </TableCell>
      <TableCell className="text-right">
        {entry && (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              step="0.001"
              min="0"
              placeholder="Qtd."
              autoFocus
              className="h-8 w-20"
              value={entry.quantity}
              onChange={(event) => onQuantityChange(event.target.value)}
            />
            <span className="text-xs text-muted-foreground">{supply.unit}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="w-0">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditSupply(supply)}>Editar insumo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMoveSupply(supply)} disabled={isMoving}>
              {supply.isIngredient ? "Mover para outros" : "Mover para ingredientes"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteSupply(supply)} disabled={isDeleting}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

type RecipeOption = {
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

function RecipeChecklistRow({
  recipe,
  entry,
  onToggle,
  onQuantityChange,
  onEditRecipe,
  onDeleteRecipe,
  isDeleting,
}: {
  recipe: RecipeOption;
  entry: SelectionEntry | undefined;
  onToggle: () => void;
  onQuantityChange: (quantity: string) => void;
  onEditRecipe: (recipe: RecipeOption) => void;
  onDeleteRecipe: (recipe: RecipeOption) => void;
  isDeleting: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const key = `recipe:${recipe.id}`;

  return (
    <>
      <TableRow>
        <TableCell className="w-0">
          <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
        </TableCell>
        <TableCell className="max-w-32 truncate sm:max-w-none">
          <label htmlFor={`edit-item-${key}`} className="flex cursor-pointer items-baseline gap-2">
            <span className="truncate font-heading font-medium">{recipe.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {recipe.yieldQuantity} {recipe.yieldUnit} • {currencyFormatter.format(recipe.costTotal)}
            </span>
          </label>
        </TableCell>
        <TableCell className="text-right">
          {entry && (
            <div className="flex items-center justify-end gap-1">
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="Qtd."
                autoFocus
                className="h-8 w-20"
                value={entry.quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">{recipe.yieldUnit}</span>
            </div>
          )}
        </TableCell>
        <TableCell className="w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded((value) => !value)}
            aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="bg-muted/30 py-3">
            <div className="space-y-2 text-sm">
              {recipe.ingredients.length === 0 ? (
                <p className="text-muted-foreground">Nenhum ingrediente cadastrado.</p>
              ) : (
                <ul className="space-y-1">
                  {recipe.ingredients.map((ingredient) => {
                    const ingredientCost = ingredient.quantity * ingredient.supply.costPerUnit;
                    return (
                      <li
                        key={ingredient.id}
                        className="flex items-center justify-between gap-3 text-muted-foreground"
                      >
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
              )}

              <div className="border-t border-border" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">
                  {recipe.yieldQuantity} {recipe.yieldUnit} • {currencyFormatter.format(recipe.costTotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEditRecipe(recipe)}
                >
                  Editar receita
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDeleteRecipe(recipe)}
                  disabled={isDeleting}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function RecipeChecklistTab({
  recipes,
  search,
  onSearchChange,
  selected,
  onToggle,
  onQuantityChange,
  onEditRecipe,
  onDeleteRecipe,
  isDeleting,
  onCreate,
}: {
  recipes: RecipeOption[];
  search: string;
  onSearchChange: (value: string) => void;
  selected: Record<string, SelectionEntry>;
  onToggle: (id: string) => void;
  onQuantityChange: (id: string, quantity: string) => void;
  onEditRecipe: (recipe: RecipeOption) => void;
  onDeleteRecipe: (recipe: RecipeOption) => void;
  isDeleting: boolean;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-3">
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar receita"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon-sm" onClick={onCreate} aria-label="Nova receita">
          <PlusIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3">
        {recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {search ? `Nenhuma receita encontrada para "${search}".` : "Nenhuma receita cadastrada."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Table>
              <TableBody>
                {recipes.map((recipe) => (
                  <RecipeChecklistRow
                    key={recipe.id}
                    recipe={recipe}
                    entry={selected[`recipe:${recipe.id}`]}
                    onToggle={() => onToggle(recipe.id)}
                    onQuantityChange={(quantity) => onQuantityChange(recipe.id, quantity)}
                    onEditRecipe={onEditRecipe}
                    onDeleteRecipe={onDeleteRecipe}
                    isDeleting={isDeleting}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

function SupplyChecklistTab({
  supplies,
  search,
  onSearchChange,
  selected,
  onToggle,
  onQuantityChange,
  onEditSupply,
  onDeleteSupply,
  isDeleting,
  onMoveSupply,
  isMoving,
  searchPlaceholder,
  emptyLabel,
  noResultsLabel,
  onCreate,
  createLabel,
}: {
  supplies: SupplyOption[];
  search: string;
  onSearchChange: (value: string) => void;
  selected: Record<string, SelectionEntry>;
  onToggle: (id: string) => void;
  onQuantityChange: (id: string, quantity: string) => void;
  onEditSupply: (supply: SupplyOption) => void;
  onDeleteSupply: (supply: SupplyOption) => void;
  isDeleting: boolean;
  onMoveSupply: (supply: SupplyOption) => void;
  isMoving: boolean;
  searchPlaceholder: string;
  emptyLabel: string;
  noResultsLabel: string;
  onCreate: () => void;
  createLabel: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-3">
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon-sm" onClick={onCreate} aria-label={createLabel}>
          <PlusIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3">
        {supplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">{search ? noResultsLabel : emptyLabel}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Table>
              <TableBody>
                {supplies.map((supply) => (
                  <SupplyChecklistRow
                    key={supply.id}
                    supply={supply}
                    entry={selected[`supply:${supply.id}`]}
                    onToggle={() => onToggle(supply.id)}
                    onQuantityChange={(quantity) => onQuantityChange(supply.id, quantity)}
                    onEditSupply={onEditSupply}
                    onDeleteSupply={onDeleteSupply}
                    isDeleting={isDeleting}
                    onMoveSupply={onMoveSupply}
                    isMoving={isMoving}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

export function EditCostSheetItemsModal({
  isOpen,
  productId,
  organizationId,
  onClose,
}: EditCostSheetItemsModalProps) {
  const [selected, setSelected] = useState<Record<string, SelectionEntry>>({});
  const [hasSeeded, setHasSeeded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsTab, setItemsTab] = useState<CatalogTarget>("recipes");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [otherSearch, setOtherSearch] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const [mode, setMode] = useState<"items" | "catalog">("items");
  const [catalogTarget, setCatalogTarget] = useState<CatalogTarget>("ingredients");
  const [catalogAutoCreate, setCatalogAutoCreate] = useState(false);
  const [catalogEditSupply, setCatalogEditSupply] = useState<SupplyOption | null>(null);
  const [catalogEditRecipe, setCatalogEditRecipe] = useState<RecipeOption | null>(null);
  const [catalogReturnsToItems, setCatalogReturnsToItems] = useState(false);
  const [catalogSessionId, setCatalogSessionId] = useState(0);
  const [suppliesForm, setSuppliesForm] = useState<CatalogFormMeta | null>(null);
  const [recipesForm, setRecipesForm] = useState<CatalogFormMeta | null>(null);

  const { data: suppliesData, isLoading: isLoadingSupplies } = useGetSupplies({ organizationId });
  const allIngredients = useMemo(
    () => (suppliesData?.supplies ?? []).filter((supply) => supply.isIngredient),
    [suppliesData],
  );
  const allOthers = useMemo(
    () => (suppliesData?.supplies ?? []).filter((supply) => !supply.isIngredient),
    [suppliesData],
  );

  const { data: recipesData, isLoading: isLoadingRecipes } = useGetRecipes({ organizationId });
  const allRecipes = useMemo(() => recipesData?.recipes ?? [], [recipesData]);

  const filteredIngredients = useMemo(() => {
    const term = normalize(ingredientSearch.trim());
    let list = allIngredients;
    if (term) list = list.filter((supply) => normalize(supply.name).includes(term));
    if (showOnlySelected) list = list.filter((supply) => selected[`supply:${supply.id}`]);
    return list;
  }, [allIngredients, ingredientSearch, showOnlySelected, selected]);

  const filteredOthers = useMemo(() => {
    const term = normalize(otherSearch.trim());
    let list = allOthers;
    if (term) list = list.filter((supply) => normalize(supply.name).includes(term));
    if (showOnlySelected) list = list.filter((supply) => selected[`supply:${supply.id}`]);
    return list;
  }, [allOthers, otherSearch, showOnlySelected, selected]);

  const filteredRecipes = useMemo(() => {
    const term = normalize(recipeSearch.trim());
    let list = allRecipes;
    if (term) list = list.filter((recipe) => normalize(recipe.name).includes(term));
    if (showOnlySelected) list = list.filter((recipe) => selected[`recipe:${recipe.id}`]);
    return list;
  }, [allRecipes, recipeSearch, showOnlySelected, selected]);

  const { data: productSuppliesData, isLoading: isLoadingProductSupplies } = useGetProductSupplies({ productId });
  const supplyItems = useMemo(() => productSuppliesData?.items ?? [], [productSuppliesData]);

  const { data: productRecipesData, isLoading: isLoadingProductRecipes } = useGetProductRecipes({ productId });
  const recipeItems = useMemo(() => productRecipesData?.items ?? [], [productRecipesData]);

  const isLoading = isLoadingSupplies || isLoadingRecipes || isLoadingProductSupplies || isLoadingProductRecipes;

  useEffect(() => {
    if (!isOpen) {
      setHasSeeded(false);
      setRecipeSearch("");
      setIngredientSearch("");
      setOtherSearch("");
      setItemsTab("recipes");
      setShowOnlySelected(false);
      setMode("items");
      setSuppliesForm(null);
      setRecipesForm(null);
      setCatalogReturnsToItems(false);
      return;
    }
    if (hasSeeded || isLoading) return;

    const seed: Record<string, SelectionEntry> = {};
    for (const item of supplyItems) {
      seed[`supply:${item.supply.id}`] = { type: "supply", quantity: String(item.quantity) };
    }
    for (const item of recipeItems) {
      seed[`recipe:${item.recipe.id}`] = { type: "recipe", quantity: String(item.quantity) };
    }
    setSelected(seed);
    setHasSeeded(true);
  }, [isOpen, hasSeeded, isLoading, supplyItems, recipeItems]);

  const { mutateAsync: addProductSupply } = useAddProductSupply({ productId });
  const { mutateAsync: updateProductSupply } = useUpdateProductSupply({ productId });
  const { mutateAsync: removeProductSupply } = useRemoveProductSupply({ productId });
  const { mutateAsync: addProductRecipe } = useAddProductRecipe({ productId });
  const { mutateAsync: updateProductRecipe } = useUpdateProductRecipe({ productId });
  const { mutateAsync: removeProductRecipe } = useRemoveProductRecipe({ productId });
  const { mutateAsync: deleteSupply, isPending: isDeletingSupply } = useDeleteSupply({ organizationId });
  const { mutateAsync: deleteRecipe, isPending: isDeletingRecipe } = useDeleteRecipe({ organizationId });
  const { mutateAsync: updateSupply, isPending: isMovingSupply } = useUpdateSupply({ organizationId });

  async function handleMoveSupply(supply: SupplyOption) {
    try {
      await updateSupply({
        id: supply.id,
        name: supply.name,
        unit: supply.unit,
        purchasePrice: supply.purchasePrice,
        purchaseQuantity: supply.purchaseQuantity,
        isIngredient: !supply.isIngredient,
      });
      toast.success(supply.isIngredient ? "Insumo movido para outros." : "Insumo movido para ingredientes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover insumo.");
    }
  }

  async function handleDeleteSupply(supply: SupplyOption) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o insumo "${supply.name}"? Ele será removido da ficha técnica dos produtos vinculados.`,
    );
    if (!confirmed) return;

    try {
      await deleteSupply({ id: supply.id, organizationId });
      setSelected((prev) => {
        const key = `supply:${supply.id}`;
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Insumo excluído com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir insumo.");
    }
  }

  async function handleDeleteRecipe(recipe: RecipeOption) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a receita "${recipe.name}"? Ela será removida da ficha técnica dos produtos vinculados.`,
    );
    if (!confirmed) return;

    try {
      await deleteRecipe({ id: recipe.id, organizationId });
      setSelected((prev) => {
        const key = `recipe:${recipe.id}`;
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Receita excluída com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir receita.");
    }
  }

  function toggle(type: ItemType, id: string) {
    const key = `${type}:${id}`;
    setSelected((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { type, quantity: "" } };
    });
  }

  function setQuantity(type: ItemType, id: string, quantity: string) {
    const key = `${type}:${id}`;
    setSelected((prev) => (prev[key] ? { ...prev, [key]: { type, quantity } } : prev));
  }

  function openCatalog(
    target: CatalogTarget,
    options: { autoCreate?: boolean; editSupply?: SupplyOption; editRecipe?: RecipeOption } = {},
  ) {
    setCatalogTarget(target);
    setCatalogAutoCreate(!!options.autoCreate);
    setCatalogEditSupply(options.editSupply ?? null);
    setCatalogEditRecipe(options.editRecipe ?? null);
    // A direct jump into the create/edit form (via the "+"/detail "Editar" button
    // in the items screen) should have Cancel/Save/Voltar return straight to
    // "items" — skipping the catalog list, since the user never actually visited it.
    setCatalogReturnsToItems(!!options.autoCreate || !!options.editSupply || !!options.editRecipe);
    setSuppliesForm(null);
    setRecipesForm(null);
    setCatalogSessionId((id) => id + 1);
    setMode("catalog");
  }

  const handleSuppliesViewChange = useCallback(
    (view: "list" | "form", meta?: CatalogFormMeta) => {
      setSuppliesForm(view === "form" ? (meta ?? null) : null);
      if (view === "list" && catalogReturnsToItems) {
        setCatalogReturnsToItems(false);
        setMode("items");
      }
    },
    [catalogReturnsToItems],
  );

  const handleRecipesViewChange = useCallback(
    (view: "list" | "form", meta?: CatalogFormMeta) => {
      setRecipesForm(view === "form" ? (meta ?? null) : null);
      if (view === "list" && catalogReturnsToItems) {
        setCatalogReturnsToItems(false);
        setMode("items");
      }
    },
    [catalogReturnsToItems],
  );

  const activeCatalogForm = catalogTarget === "recipes" ? recipesForm : suppliesForm;

  function handleBack() {
    if (activeCatalogForm) {
      activeCatalogForm.onCancel();
    } else {
      setMode("items");
    }
  }

  const selectedCount = Object.keys(selected).length;

  async function handleSave() {
    const entries = Object.entries(selected);

    const parsed: { type: ItemType; id: string; quantity: number }[] = [];
    for (const [key, entry] of entries) {
      const [type, id] = key.split(":") as [ItemType, string];
      const value = Number(entry.quantity.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) {
        toast.error("Informe uma quantidade válida para todos os itens selecionados.");
        return;
      }
      parsed.push({ type, id, quantity: value });
    }

    setIsSaving(true);
    try {
      const existingSupplyBySupplyId = new Map(supplyItems.map((item) => [item.supply.id, item]));
      const existingRecipeByRecipeId = new Map(recipeItems.map((item) => [item.recipe.id, item]));
      const writes: Promise<unknown>[] = [];

      for (const entry of parsed) {
        if (entry.type === "supply") {
          const existing = existingSupplyBySupplyId.get(entry.id);
          if (existing) {
            if (existing.quantity !== entry.quantity) {
              writes.push(updateProductSupply({ id: existing.id, quantity: entry.quantity }));
            }
            existingSupplyBySupplyId.delete(entry.id);
          } else {
            writes.push(addProductSupply({ productId, supplyId: entry.id, quantity: entry.quantity }));
          }
        } else {
          const existing = existingRecipeByRecipeId.get(entry.id);
          if (existing) {
            if (existing.quantity !== entry.quantity) {
              writes.push(updateProductRecipe({ id: existing.id, quantity: entry.quantity }));
            }
            existingRecipeByRecipeId.delete(entry.id);
          } else {
            writes.push(addProductRecipe({ productId, recipeId: entry.id, quantity: entry.quantity }));
          }
        }
      }

      for (const remaining of existingSupplyBySupplyId.values()) {
        writes.push(removeProductSupply({ id: remaining.id, productId }));
      }
      for (const remaining of existingRecipeByRecipeId.values()) {
        writes.push(removeProductRecipe({ id: remaining.id, productId }));
      }

      await Promise.all(writes);
      toast.success("Ficha técnica atualizada com sucesso.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar ficha técnica.");
    } finally {
      setIsSaving(false);
    }
  }

  // Catalog mode is only ever entered via "+" (create) or the accordion's "Editar"
  // button (edit), so this only covers the brief instant before the child
  // manager's own effect reports its exact title.
  const catalogFallbackTitle =
    catalogTarget === "recipes"
      ? catalogEditRecipe
        ? "Editar receita"
        : "Nova receita"
      : catalogEditSupply
        ? catalogTarget === "ingredients"
          ? "Editar ingrediente"
          : "Editar item"
        : catalogTarget === "ingredients"
          ? "Novo ingrediente"
          : "Novo item";
  const headerTitle =
    mode === "catalog" ? (activeCatalogForm?.title ?? catalogFallbackTitle) : "Ficha técnica";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            {mode === "catalog" && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleBack} aria-label="Voltar">
                <ArrowLeftIcon />
              </Button>
            )}
            <DialogTitle>{headerTitle}</DialogTitle>
          </div>
        </DialogHeader>

        {mode === "items" ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col">
              {isLoading ? (
                <div className="px-5 pb-3">
                  <LoadingState label="Carregando..." />
                </div>
              ) : (
                <Tabs
                  value={itemsTab}
                  onValueChange={(value) => value && setItemsTab(value as CatalogTarget)}
                  className="min-h-0 flex-1 gap-3"
                >
                  <div className="mx-5 flex items-center gap-4">
                    <TabsList className="w-fit">
                      <TabsTrigger value="recipes">Receitas</TabsTrigger>
                      <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                      <TabsTrigger value="others">Outros</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-only-selected"
                        checked={showOnlySelected}
                        onCheckedChange={(checked) => setShowOnlySelected(!!checked)}
                      />
                      <Label htmlFor="show-only-selected" className="cursor-pointer text-sm text-muted-foreground">
                        Filtrar selecionados ({selectedCount})
                      </Label>
                    </div>
                  </div>

                  <TabsContent value="recipes" className="flex min-h-0 flex-1 flex-col">
                    <RecipeChecklistTab
                      recipes={filteredRecipes}
                      search={recipeSearch}
                      onSearchChange={setRecipeSearch}
                      selected={selected}
                      onToggle={(id) => toggle("recipe", id)}
                      onQuantityChange={(id, quantity) => setQuantity("recipe", id, quantity)}
                      onEditRecipe={(recipe) => openCatalog("recipes", { editRecipe: recipe })}
                      onDeleteRecipe={handleDeleteRecipe}
                      isDeleting={isDeletingRecipe}
                      onCreate={() => openCatalog("recipes", { autoCreate: true })}
                    />
                  </TabsContent>

                  <TabsContent value="ingredients" className="flex min-h-0 flex-1 flex-col">
                    <SupplyChecklistTab
                      supplies={filteredIngredients}
                      search={ingredientSearch}
                      onSearchChange={setIngredientSearch}
                      selected={selected}
                      onToggle={(id) => toggle("supply", id)}
                      onQuantityChange={(id, quantity) => setQuantity("supply", id, quantity)}
                      onEditSupply={(supply) => openCatalog("ingredients", { editSupply: supply })}
                      onDeleteSupply={handleDeleteSupply}
                      isDeleting={isDeletingSupply}
                      onMoveSupply={handleMoveSupply}
                      isMoving={isMovingSupply}
                      searchPlaceholder="Buscar ingrediente"
                      emptyLabel="Nenhum ingrediente cadastrado."
                      noResultsLabel={`Nenhum ingrediente encontrado para "${ingredientSearch}".`}
                      onCreate={() => openCatalog("ingredients", { autoCreate: true })}
                      createLabel="Novo ingrediente"
                    />
                  </TabsContent>

                  <TabsContent value="others" className="flex min-h-0 flex-1 flex-col">
                    <SupplyChecklistTab
                      supplies={filteredOthers}
                      search={otherSearch}
                      onSearchChange={setOtherSearch}
                      selected={selected}
                      onToggle={(id) => toggle("supply", id)}
                      onQuantityChange={(id, quantity) => setQuantity("supply", id, quantity)}
                      onEditSupply={(supply) => openCatalog("others", { editSupply: supply })}
                      onDeleteSupply={handleDeleteSupply}
                      isDeleting={isDeletingSupply}
                      onMoveSupply={handleMoveSupply}
                      isMoving={isMovingSupply}
                      searchPlaceholder="Buscar item"
                      emptyLabel="Nenhum item cadastrado."
                      noResultsLabel={`Nenhum item encontrado para "${otherSearch}".`}
                      onCreate={() => openCatalog("others", { autoCreate: true })}
                      createLabel="Novo item"
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border p-5">
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving || isLoading}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {catalogTarget === "recipes" ? (
              <RecipesManager
                key={`recipes-${catalogSessionId}`}
                organizationId={organizationId}
                showFormHeader={false}
                autoCreate={catalogAutoCreate}
                initialEditRecipe={catalogEditRecipe}
                onViewChange={handleRecipesViewChange}
              />
            ) : (
              <SuppliesManager
                key={`supplies-${catalogTarget}-${catalogSessionId}`}
                organizationId={organizationId}
                showFormHeader={false}
                autoCreate={catalogAutoCreate}
                initialEditSupply={catalogEditSupply}
                context={catalogTarget === "ingredients" ? "ingredient" : "other"}
                onViewChange={handleSuppliesViewChange}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
