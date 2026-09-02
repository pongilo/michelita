import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EditIcon, ListIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { RecipeFormModal, type RecipeFormValues } from "@/components/recipe-form-modal";
import { RecipeIngredientsModal } from "@/components/recipe-ingredients-modal";
import { useGetRecipes } from "@/hooks/tanstack/recipe/use-get-recipes";
import { useCreateRecipe } from "@/hooks/tanstack/recipe/use-create-recipe";
import { useUpdateRecipe } from "@/hooks/tanstack/recipe/use-update-recipe";
import { useDeleteRecipe } from "@/hooks/tanstack/recipe/use-delete-recipe";
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

type RecipesManagerProps = {
  organizationId: string;
};

export function RecipesManager({ organizationId }: RecipesManagerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [ingredientsRecipe, setIngredientsRecipe] = useState<Recipe | null>(null);

  const { data, isLoading } = useGetRecipes({ organizationId });
  const allRecipes = useMemo(() => data?.recipes ?? [], [data]);
  const total = allRecipes.length;

  const recipes = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return allRecipes;
    return allRecipes.filter((recipe) => normalize(recipe.name).includes(search));
  }, [allRecipes, searchInput]);

  const { mutateAsync: createRecipe, isPending: isCreating } = useCreateRecipe();
  const { mutateAsync: updateRecipe, isPending: isUpdating } = useUpdateRecipe({ organizationId });
  const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe({ organizationId });
  const isSubmitting = isCreating || isUpdating;

  function handleStartCreate() {
    setEditingRecipe(null);
    setIsFormOpen(true);
  }

  function handleStartEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingRecipe(null);
  }

  async function onSubmit(values: RecipeFormValues) {
    try {
      if (editingRecipe) {
        await updateRecipe({ id: editingRecipe.id, organizationId, ...values });
        toast.success("Receita atualizada com sucesso.");
      } else {
        await createRecipe({ organizationId, ...values });
        toast.success("Receita criada com sucesso.");
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar receita.");
    }
  }

  async function handleDelete(recipe: Recipe) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a receita "${recipe.name}"? Ela será removida da ficha técnica dos produtos vinculados.`,
    );
    if (!confirmed) return;

    try {
      await deleteRecipe({ id: recipe.id, organizationId });
      toast.success("Receita excluída com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir receita.");
    }
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
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
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
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setIngredientsRecipe(recipe)}
                          disabled={isDeleting}
                          aria-label="Ingredientes"
                        >
                          <ListIcon />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(recipe)}
                          disabled={isDeleting}
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDelete(recipe)}
                          disabled={isDeleting}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <RecipeFormModal
        isOpen={isFormOpen}
        mode={editingRecipe ? "edit" : "create"}
        isSubmitting={isSubmitting}
        initialValues={editingRecipe ?? undefined}
        onClose={handleCloseForm}
        onSubmit={onSubmit}
      />

      <RecipeIngredientsModal
        isOpen={ingredientsRecipe !== null}
        recipe={ingredientsRecipe}
        organizationId={organizationId}
        onClose={() => setIngredientsRecipe(null)}
      />
    </>
  );
}
