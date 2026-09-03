import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { RecipeForm } from "@/components/recipe-form";
import { useGetRecipes } from "@/hooks/tanstack/recipe/use-get-recipes";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { normalize } from "@/lib/utils";
import { currencyFormatter } from "@/lib/utils/formatter";

type Recipe = {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: string;
  costTotal: number;
  costPerYield: number | null;
};

type RecipeFormMeta = { title: string; onCancel: () => void };

type RecipesManagerProps = {
  organizationId: string;
  showFormHeader?: boolean;
  autoCreate?: boolean;
  onViewChange?: (view: "list" | "form", meta?: RecipeFormMeta) => void;
};

export function RecipesManager({
  organizationId,
  showFormHeader = true,
  autoCreate = false,
  onViewChange,
}: RecipesManagerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [view, setView] = useState<"list" | "form">(autoCreate ? "form" : "list");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  // When the recipe form opens a nested "create supply" sub-view, it reports its
  // own title/cancel here so the outer header (back button, title) reflects it
  // instead of the recipe form's own.
  const [recipeSubViewMeta, setRecipeSubViewMeta] = useState<RecipeFormMeta | null>(null);

  useEffect(() => {
    if (view === "form") {
      onViewChange?.(
        "form",
        recipeSubViewMeta ?? { title: editingRecipe ? "Editar receita" : "Nova receita", onCancel: handleCancelForm },
      );
    } else {
      onViewChange?.("list");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, editingRecipe, onViewChange, recipeSubViewMeta]);

  const { data, isLoading } = useGetRecipes({ organizationId });
  const allRecipes = useMemo(() => data?.recipes ?? [], [data]);
  const total = allRecipes.length;

  const recipes = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return allRecipes;
    return allRecipes.filter((recipe) => normalize(recipe.name).includes(search));
  }, [allRecipes, searchInput]);

  function handleStartCreate() {
    setEditingRecipe(null);
    setView("form");
  }

  function handleStartEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    setView("form");
  }

  function handleCancelForm() {
    setView("list");
    setEditingRecipe(null);
  }

  if (view === "form") {
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {showFormHeader && (
          <div className="flex items-center gap-2 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={recipeSubViewMeta ? recipeSubViewMeta.onCancel : handleCancelForm}
              aria-label="Voltar"
            >
              <ArrowLeftIcon />
            </Button>
            <h4 className="font-heading text-sm font-medium">
              {recipeSubViewMeta ? recipeSubViewMeta.title : editingRecipe ? "Editar receita" : "Nova receita"}
            </h4>
          </div>
        )}

        <RecipeForm
          organizationId={organizationId}
          mode={editingRecipe ? "edit" : "create"}
          recipe={editingRecipe}
          onCancel={handleCancelForm}
          onSubViewChange={setRecipeSubViewMeta}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar receita"
          className="flex-1"
        />
        <Button type="button" size="icon-sm" onClick={handleStartCreate} aria-label="Nova receita">
          <PlusIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {isLoading ? (
          <LoadingState label="Carregando receitas..." />
        ) : total === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🍰</EmptyState.Icon>
            <EmptyState.Title>Nenhuma receita ainda</EmptyState.Title>
            <EmptyState.Description>
              Agrupe insumos em receitas reutilizáveis para montar a ficha técnica dos seus produtos.
            </EmptyState.Description>
            <EmptyState.Action>
              <Button size="sm" onClick={handleStartCreate}>
                Nova receita
              </Button>
            </EmptyState.Action>
          </EmptyState>
        ) : recipes.length === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🔍</EmptyState.Icon>
            <EmptyState.Title>Nenhuma receita encontrada</EmptyState.Title>
            <EmptyState.Description>Nenhum resultado para "{searchInput}"</EmptyState.Description>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Rendimento</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Custo total</TableHead>
                  <TableHead className="text-right">Custo/rendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow
                    key={recipe.id}
                    className="cursor-pointer"
                    onClick={() => handleStartEdit(recipe)}
                  >
                    <TableCell className="max-w-32 truncate font-heading font-medium sm:max-w-none">
                      {recipe.name}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {recipe.yieldQuantity} {recipe.yieldUnit}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {currencyFormatter.format(recipe.costTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {recipe.costPerYield !== null ? currencyFormatter.format(recipe.costPerYield) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
