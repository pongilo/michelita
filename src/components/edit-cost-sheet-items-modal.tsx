import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, PlusIcon, SettingsIcon } from "lucide-react";
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
type CatalogTab = "supplies" | "recipes";
type CatalogFormMeta = { title: string; onCancel: () => void };

type EditCostSheetItemsModalProps = {
  isOpen: boolean;
  productId: string;
  organizationId: string;
  onClose: () => void;
};

export function EditCostSheetItemsModal({
  isOpen,
  productId,
  organizationId,
  onClose,
}: EditCostSheetItemsModalProps) {
  const [selected, setSelected] = useState<Record<string, SelectionEntry>>({});
  const [hasSeeded, setHasSeeded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsTab, setItemsTab] = useState<CatalogTab>("recipes");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [supplySearch, setSupplySearch] = useState("");

  const [mode, setMode] = useState<"items" | "catalog">("items");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("supplies");
  const [catalogAutoCreate, setCatalogAutoCreate] = useState(false);
  const [catalogReturnsToItems, setCatalogReturnsToItems] = useState(false);
  const [catalogSessionId, setCatalogSessionId] = useState(0);
  const [suppliesForm, setSuppliesForm] = useState<CatalogFormMeta | null>(null);
  const [recipesForm, setRecipesForm] = useState<CatalogFormMeta | null>(null);

  const { data: suppliesData, isLoading: isLoadingSupplies } = useGetSupplies({ organizationId });
  const allSupplies = useMemo(() => suppliesData?.supplies ?? [], [suppliesData]);

  const { data: recipesData, isLoading: isLoadingRecipes } = useGetRecipes({ organizationId });
  const allRecipes = useMemo(() => recipesData?.recipes ?? [], [recipesData]);

  const filteredSupplies = useMemo(() => {
    const term = normalize(supplySearch.trim());
    if (!term) return allSupplies;
    return allSupplies.filter((supply) => normalize(supply.name).includes(term));
  }, [allSupplies, supplySearch]);

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
      setSupplySearch("");
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

  function openCatalog(tab: CatalogTab, autoCreate: boolean) {
    setCatalogTab(tab);
    setCatalogAutoCreate(autoCreate);
    // A direct jump into the create form (via the "+" next to a tab in the items
    // screen) should have Cancel/Save/Voltar return straight to "items" — skipping
    // the catalog list, since the user never actually visited it.
    setCatalogReturnsToItems(autoCreate);
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

  const activeCatalogForm = catalogTab === "supplies" ? suppliesForm : recipesForm;

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

  const catalogListTitle = catalogTab === "supplies" ? "Gerenciar insumos" : "Gerenciar receitas";
  const headerTitle =
    mode === "catalog" ? (activeCatalogForm?.title ?? catalogListTitle) : "Itens da ficha técnica";

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
                  onValueChange={(value) => value && setItemsTab(value as CatalogTab)}
                  className="min-h-0 flex-1 gap-3"
                >
                  <TabsList className="mx-5 w-fit">
                    <TabsTrigger value="recipes">Receitas</TabsTrigger>
                    <TabsTrigger value="supplies">Insumos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="recipes" className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center gap-2 px-5 pb-3">
                      <Input
                        type="search"
                        value={recipeSearch}
                        onChange={(event) => setRecipeSearch(event.target.value)}
                        placeholder="Buscar receita"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openCatalog("recipes", true)}
                        aria-label="Nova receita"
                      >
                        <PlusIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openCatalog("recipes", false)}
                        aria-label="Gerenciar receitas"
                      >
                        <SettingsIcon />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-3">
                      {allRecipes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
                      ) : filteredRecipes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma receita encontrada para "{recipeSearch}".
                        </p>
                      ) : (
                        <ItemGroup>
                          {filteredRecipes.map((recipe) => {
                            const key = `recipe:${recipe.id}`;
                            const entry = selected[key];
                            return (
                              <Item key={key} variant="outline" size="sm">
                                <Checkbox
                                  id={`edit-item-${key}`}
                                  checked={!!entry}
                                  onCheckedChange={() => toggle("recipe", recipe.id)}
                                />
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
                                      onChange={(event) => setQuantity("recipe", recipe.id, event.target.value)}
                                    />
                                    <span className="text-xs text-muted-foreground">{recipe.yieldUnit}</span>
                                  </ItemActions>
                                )}
                              </Item>
                            );
                          })}
                        </ItemGroup>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="supplies" className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center gap-2 px-5 pb-3">
                      <Input
                        type="search"
                        value={supplySearch}
                        onChange={(event) => setSupplySearch(event.target.value)}
                        placeholder="Buscar insumo"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openCatalog("supplies", true)}
                        aria-label="Novo insumo"
                      >
                        <PlusIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openCatalog("supplies", false)}
                        aria-label="Gerenciar insumos"
                      >
                        <SettingsIcon />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-3">
                      {allSupplies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum insumo cadastrado.</p>
                      ) : filteredSupplies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum insumo encontrado para "{supplySearch}".
                        </p>
                      ) : (
                        <ItemGroup>
                          {filteredSupplies.map((supply) => {
                            const key = `supply:${supply.id}`;
                            const entry = selected[key];
                            return (
                              <Item key={key} variant="outline" size="sm">
                                <Checkbox
                                  id={`edit-item-${key}`}
                                  checked={!!entry}
                                  onCheckedChange={() => toggle("supply", supply.id)}
                                />
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
                                      onChange={(event) => setQuantity("supply", supply.id, event.target.value)}
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
            {catalogTab === "supplies" ? (
              <SuppliesManager
                key={`supplies-${catalogSessionId}`}
                organizationId={organizationId}
                showFormHeader={false}
                autoCreate={catalogAutoCreate}
                onViewChange={handleSuppliesViewChange}
              />
            ) : (
              <RecipesManager
                key={`recipes-${catalogSessionId}`}
                organizationId={organizationId}
                showFormHeader={false}
                autoCreate={catalogAutoCreate}
                onViewChange={handleRecipesViewChange}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
