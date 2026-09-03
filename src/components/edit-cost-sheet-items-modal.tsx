import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Item, ItemActions, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuppliesManager } from "@/components/supplies-manager";
import { RecipesManager } from "@/components/recipes-manager";
import { normalize } from "@/lib/utils";
import { currencyFormatter, unitCostFormatter } from "@/lib/utils/formatter";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useAddProductSupply } from "@/hooks/tanstack/product-supply/use-add-product-supply";
import { useUpdateProductSupply } from "@/hooks/tanstack/product-supply/use-update-product-supply";
import { useRemoveProductSupply } from "@/hooks/tanstack/product-supply/use-remove-product-supply";
import { useGetRecipes } from "@/hooks/tanstack/recipe/use-get-recipes";
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
}: {
  supply: SupplyOption;
  entry: SelectionEntry | undefined;
  onToggle: () => void;
  onQuantityChange: (quantity: string) => void;
  onEditSupply: (supply: SupplyOption) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const key = `supply:${supply.id}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Item variant="outline" size="sm" className="flex-1">
          <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
          <label htmlFor={`edit-item-${key}`} className="flex flex-1 cursor-pointer flex-col">
            <ItemTitle>{supply.name}</ItemTitle>
          </label>
          {entry && (
            <ItemActions>
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
            </ItemActions>
          )}
        </Item>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsExpanded((value) => !value)}
          aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Preço da compra</span>
            <span className="font-medium">{currencyFormatter.format(supply.purchasePrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Qtd. comprada</span>
            <span className="font-medium">
              {supply.purchaseQuantity} {supply.unit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custo/unidade</span>
            <span className="font-medium">
              {unitCostFormatter.format(supply.costPerUnit)} / {supply.unit}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onEditSupply(supply)}>
            Editar insumo
          </Button>
        </div>
      )}
    </div>
  );
}

type RecipeOption = {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: string;
  costTotal: number;
  costPerYield: number | null;
  ingredients: { id: string; quantity: number; supply: { id: string; name: string; unit: string } }[];
};

function RecipeChecklistRow({
  recipe,
  entry,
  onToggle,
  onQuantityChange,
  onEditRecipe,
}: {
  recipe: RecipeOption;
  entry: SelectionEntry | undefined;
  onToggle: () => void;
  onQuantityChange: (quantity: string) => void;
  onEditRecipe: (recipe: RecipeOption) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const key = `recipe:${recipe.id}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Item variant="outline" size="sm" className="flex-1">
          <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
          <label htmlFor={`edit-item-${key}`} className="flex flex-1 cursor-pointer flex-col">
            <ItemTitle>{recipe.name}</ItemTitle>
          </label>
          {entry && (
            <ItemActions>
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
            </ItemActions>
          )}
        </Item>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsExpanded((value) => !value)}
          aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 text-sm">
          {recipe.ingredients.length === 0 ? (
            <p className="text-muted-foreground">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-center justify-between gap-3 text-muted-foreground">
                  <span className="truncate">{ingredient.supply.name}</span>
                  <span className="shrink-0">
                    {ingredient.quantity} {ingredient.supply.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Rendimento</span>
            <span className="font-medium">
              {recipe.yieldQuantity} {recipe.yieldUnit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custo total</span>
            <span className="font-medium">{currencyFormatter.format(recipe.costTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custo/rendimento</span>
            <span className="font-medium">
              {recipe.costPerYield !== null ? currencyFormatter.format(recipe.costPerYield) : "—"}
            </span>
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onEditRecipe(recipe)}>
            Editar receita
          </Button>
        </div>
      )}
    </div>
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
  onCreate,
}: {
  recipes: RecipeOption[];
  search: string;
  onSearchChange: (value: string) => void;
  selected: Record<string, SelectionEntry>;
  onToggle: (id: string) => void;
  onQuantityChange: (id: string, quantity: string) => void;
  onEditRecipe: (recipe: RecipeOption) => void;
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
          <ItemGroup>
            {recipes.map((recipe) => (
              <RecipeChecklistRow
                key={recipe.id}
                recipe={recipe}
                entry={selected[`recipe:${recipe.id}`]}
                onToggle={() => onToggle(recipe.id)}
                onQuantityChange={(quantity) => onQuantityChange(recipe.id, quantity)}
                onEditRecipe={onEditRecipe}
              />
            ))}
          </ItemGroup>
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
          <ItemGroup>
            {supplies.map((supply) => (
              <SupplyChecklistRow
                key={supply.id}
                supply={supply}
                entry={selected[`supply:${supply.id}`]}
                onToggle={() => onToggle(supply.id)}
                onQuantityChange={(quantity) => onQuantityChange(supply.id, quantity)}
                onEditSupply={onEditSupply}
              />
            ))}
          </ItemGroup>
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
    if (!term) return allIngredients;
    return allIngredients.filter((supply) => normalize(supply.name).includes(term));
  }, [allIngredients, ingredientSearch]);

  const filteredOthers = useMemo(() => {
    const term = normalize(otherSearch.trim());
    if (!term) return allOthers;
    return allOthers.filter((supply) => normalize(supply.name).includes(term));
  }, [allOthers, otherSearch]);

  const filteredRecipes = useMemo(() => {
    const term = normalize(recipeSearch.trim());
    if (!term) return allRecipes;
    return allRecipes.filter((recipe) => normalize(recipe.name).includes(term));
  }, [allRecipes, recipeSearch]);

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
    mode === "catalog" ? (activeCatalogForm?.title ?? catalogFallbackTitle) : "Itens da ficha técnica";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
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
                  <TabsList className="mx-5 w-fit">
                    <TabsTrigger value="recipes">Receitas</TabsTrigger>
                    <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                    <TabsTrigger value="others">Outros</TabsTrigger>
                  </TabsList>

                  <TabsContent value="recipes" className="flex min-h-0 flex-1 flex-col">
                    <RecipeChecklistTab
                      recipes={filteredRecipes}
                      search={recipeSearch}
                      onSearchChange={setRecipeSearch}
                      selected={selected}
                      onToggle={(id) => toggle("recipe", id)}
                      onQuantityChange={(id, quantity) => setQuantity("recipe", id, quantity)}
                      onEditRecipe={(recipe) => openCatalog("recipes", { editRecipe: recipe })}
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

            <div className="flex items-center justify-between gap-3 border-t border-border p-5">
              <p className="text-sm text-muted-foreground">{selectedCount} selecionado(s)</p>
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
