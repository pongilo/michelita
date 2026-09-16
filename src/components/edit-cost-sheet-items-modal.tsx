import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, MoreVerticalIcon, PlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChecklistItem, ChecklistList } from "@/components/ui/checklist-item";
import { LoadingState } from "@/components/ui/loading-state";
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
    <ChecklistItem selected={!!entry}>
      <ChecklistItem.Row>
        <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
        <ChecklistItem.Label
          htmlFor={`edit-item-${key}`}
          title={supply.name}
          info={
            <>
              {supply.purchaseQuantity} {supply.unit} • {currencyFormatter.format(supply.purchasePrice)}
            </>
          }
        />
        {entry && (
          <ChecklistItem.Quantity value={entry.quantity} unit={supply.unit} onChange={onQuantityChange} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditSupply(supply)}>Editar insumo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMoveSupply(supply)} disabled={isMoving}>
              {supply.isIngredient ? "Mudar para material" : "Mudar para ingrediente"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteSupply(supply)} disabled={isDeleting}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ChecklistItem.Row>
    </ChecklistItem>
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
  const key = `recipe:${recipe.id}`;

  return (
    <ChecklistItem selected={!!entry}>
      <ChecklistItem.Row>
        <Checkbox id={`edit-item-${key}`} checked={!!entry} onCheckedChange={onToggle} />
        <ChecklistItem.Label
          htmlFor={`edit-item-${key}`}
          title={recipe.name}
          info={
            <>
              {recipe.yieldQuantity} {recipe.yieldUnit} • {currencyFormatter.format(recipe.costTotal)}
            </>
          }
        />
        {entry && (
          <ChecklistItem.Quantity value={entry.quantity} unit={recipe.yieldUnit} onChange={onQuantityChange} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditRecipe(recipe)}>Editar receita</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteRecipe(recipe)} disabled={isDeleting}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ChecklistItem.Row>
    </ChecklistItem>
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

      <div className="flex-1 overflow-y-auto pb-3">
        {recipes.length === 0 ? (
          <p className="px-5 text-sm text-muted-foreground">
            {search ? `Nenhuma receita encontrada para "${search}".` : "Nenhuma receita cadastrada."}
          </p>
        ) : (
          <ChecklistList>
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
          </ChecklistList>
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

      <div className="flex-1 overflow-y-auto pb-3">
        {supplies.length === 0 ? (
          <p className="px-5 text-sm text-muted-foreground">{search ? noResultsLabel : emptyLabel}</p>
        ) : (
          <ChecklistList>
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
          </ChecklistList>
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

  const { data: productSuppliesData, isLoading: isLoadingProductSupplies } = useGetProductSupplies({ productId });
  const supplyItems = useMemo(() => productSuppliesData?.items ?? [], [productSuppliesData]);

  const { data: productRecipesData, isLoading: isLoadingProductRecipes } = useGetProductRecipes({ productId });
  const recipeItems = useMemo(() => productRecipesData?.items ?? [], [productRecipesData]);

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
      toast.success(supply.isIngredient ? "Insumo movido para materiais." : "Insumo movido para ingredientes.");
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
          : "Editar material"
        : catalogTarget === "ingredients"
          ? "Novo ingrediente"
          : "Novo material";
  const headerTitle = activeCatalogForm?.title ?? catalogFallbackTitle;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {mode === "catalog" && (
          <DialogHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleBack} aria-label="Voltar">
                <ArrowLeftIcon />
              </Button>
              <DialogTitle>{headerTitle}</DialogTitle>
            </div>
          </DialogHeader>
        )}

        {mode === "items" ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col pt-5">
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
                      <TabsTrigger value="others">Materiais</TabsTrigger>
                    </TabsList>
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
                      searchPlaceholder="Buscar material"
                      emptyLabel="Nenhum material cadastrado."
                      noResultsLabel={`Nenhum material encontrado para "${otherSearch}".`}
                      onCreate={() => openCatalog("others", { autoCreate: true })}
                      createLabel="Novo material"
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
