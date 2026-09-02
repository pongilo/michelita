import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useGetRecipeSupplies } from "@/hooks/tanstack/recipe-supply/use-get-recipe-supplies";
import { useAddRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-add-recipe-supply";
import { useUpdateRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-update-recipe-supply";
import { useRemoveRecipeSupply } from "@/hooks/tanstack/recipe-supply/use-remove-recipe-supply";
import { currencyFormatter, unitCostFormatter } from "@/lib/utils/formatter";

type Recipe = {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: string;
};

type RecipeIngredientsModalProps = {
  isOpen: boolean;
  recipe: Recipe | null;
  organizationId: string;
  onClose: () => void;
};

function RecipeSupplyRow({
  item,
  onUpdate,
  onRemove,
  disabled,
}: {
  item: { id: string; quantity: number; supply: { id: string; name: string; unit: string; costPerUnit: number } };
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

export function RecipeIngredientsModal({ isOpen, recipe, organizationId, onClose }: RecipeIngredientsModalProps) {
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const recipeId = recipe?.id ?? "";

  const { data: suppliesData } = useGetSupplies({ organizationId });
  const allSupplies = suppliesData?.supplies ?? [];

  const { data, isLoading } = useGetRecipeSupplies({ recipeId });
  const items = useMemo(() => data?.items ?? [], [data]);

  const { mutateAsync: addRecipeSupply, isPending: isAdding } = useAddRecipeSupply({ recipeId, organizationId });
  const { mutateAsync: updateRecipeSupply } = useUpdateRecipeSupply({ recipeId, organizationId });
  const { mutateAsync: removeRecipeSupply, isPending: isRemoving } = useRemoveRecipeSupply({
    recipeId,
    organizationId,
  });

  const availableSupplies = useMemo(() => {
    const usedIds = new Set(items.map((item) => item.supply.id));
    return allSupplies.filter((supply) => !usedIds.has(supply.id));
  }, [allSupplies, items]);

  const costTotal = items.reduce((sum, item) => sum + item.quantity * item.supply.costPerUnit, 0);
  const costPerYield = recipe && recipe.yieldQuantity > 0 ? costTotal / recipe.yieldQuantity : null;

  async function handleAdd() {
    if (!selectedSupplyId) return;
    const parsed = Number(newQuantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    try {
      await addRecipeSupply({ recipeId, supplyId: selectedSupplyId, quantity: parsed });
      setSelectedSupplyId("");
      setNewQuantity("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar insumo.");
    }
  }

  async function handleUpdate(id: string, quantity: number) {
    try {
      await updateRecipeSupply({ id, quantity });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar insumo.");
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeRecipeSupply({ id, recipeId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover insumo.");
    }
  }

  const selectedSupplyUnit = allSupplies.find((i) => i.id === selectedSupplyId)?.unit;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Ingredientes {recipe ? `— ${recipe.name}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <LoadingState label="Carregando ingredientes..." />
          ) : (
            <>
              {items.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Insumo</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Custo/unidade</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Custo</TableHead>
                        <TableHead className="w-0" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <RecipeSupplyRow
                          key={item.id}
                          item={item}
                          disabled={isRemoving}
                          onUpdate={(quantity) => handleUpdate(item.id, quantity)}
                          onRemove={() => handleRemove(item.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {items.length > 0 && recipe && (
                <div className="space-y-2 rounded-2xl border px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Custo total</span>
                    <span className="font-medium">{currencyFormatter.format(costTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Custo por {recipe.yieldQuantity} {recipe.yieldUnit}
                    </span>
                    <span className="font-medium">
                      {costPerYield !== null ? currencyFormatter.format(costPerYield) : "—"}
                    </span>
                  </div>
                </div>
              )}

              {allSupplies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não tem insumos cadastrados.</p>
              ) : availableSupplies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos os insumos cadastrados já foram adicionados.</p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1 space-y-1">
                    <Select value={selectedSupplyId} onValueChange={(value) => setSelectedSupplyId(value ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSupplies.map((supply) => (
                          <SelectItem key={supply.id} value={supply.id}>
                            {supply.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Qtd."
                      className="w-24"
                      value={newQuantity}
                      onChange={(event) => setNewQuantity(event.target.value)}
                    />
                    {selectedSupplyUnit && <span className="text-sm text-muted-foreground">{selectedSupplyUnit}</span>}
                  </div>
                  <Button type="button" onClick={handleAdd} disabled={!selectedSupplyId || isAdding}>
                    Adicionar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
