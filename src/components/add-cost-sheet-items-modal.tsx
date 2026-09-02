import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Item, ItemActions, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddProductSupply } from "@/hooks/tanstack/product-supply/use-add-product-supply";
import { useAddProductRecipe } from "@/hooks/tanstack/product-recipe/use-add-product-recipe";

type AvailableSupply = { id: string; name: string; unit: string };
type AvailableRecipe = { id: string; name: string; yieldUnit: string };
type ItemType = "supply" | "recipe";
type SelectionEntry = { type: ItemType; quantity: string };

type AddCostSheetItemsModalProps = {
  isOpen: boolean;
  productId: string;
  availableSupplies: AvailableSupply[];
  availableRecipes: AvailableRecipe[];
  onClose: () => void;
};

export function AddCostSheetItemsModal({
  isOpen,
  productId,
  availableSupplies,
  availableRecipes,
  onClose,
}: AddCostSheetItemsModalProps) {
  const [selected, setSelected] = useState<Record<string, SelectionEntry>>({});

  useEffect(() => {
    if (isOpen) setSelected({});
  }, [isOpen]);

  const { mutateAsync: addProductSupply, isPending: isAddingSupply } = useAddProductSupply({ productId });
  const { mutateAsync: addProductRecipe, isPending: isAddingRecipe } = useAddProductRecipe({ productId });
  const isSaving = isAddingSupply || isAddingRecipe;

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

  const selectedCount = Object.keys(selected).length;

  async function handleSave() {
    const entries = Object.entries(selected);
    if (entries.length === 0) return;

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

    try {
      await Promise.all(
        parsed.map((entry) =>
          entry.type === "supply"
            ? addProductSupply({ productId, supplyId: entry.id, quantity: entry.quantity })
            : addProductRecipe({ productId, recipeId: entry.id, quantity: entry.quantity }),
        ),
      );
      toast.success("Itens adicionados à ficha técnica.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar itens.");
    }
  }

  const hasItems = availableSupplies.length > 0 || availableRecipes.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Adicionar à ficha técnica</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-3">
          {!hasItems ? (
            <p className="text-sm text-muted-foreground">Não há insumos ou receitas disponíveis para adicionar.</p>
          ) : (
            <>
              {availableSupplies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Insumos</h4>
                  <ItemGroup>
                    {availableSupplies.map((supply) => {
                      const key = `supply:${supply.id}`;
                      const entry = selected[key];
                      return (
                        <Item key={key} variant="outline" size="sm">
                          <Checkbox
                            id={`add-item-${key}`}
                            checked={!!entry}
                            onCheckedChange={() => toggle("supply", supply.id)}
                          />
                          <label htmlFor={`add-item-${key}`} className="flex flex-1 cursor-pointer flex-col">
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
                </div>
              )}

              {availableRecipes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Receitas</h4>
                  <ItemGroup>
                    {availableRecipes.map((recipe) => {
                      const key = `recipe:${recipe.id}`;
                      const entry = selected[key];
                      return (
                        <Item key={key} variant="outline" size="sm">
                          <Checkbox
                            id={`add-item-${key}`}
                            checked={!!entry}
                            onCheckedChange={() => toggle("recipe", recipe.id)}
                          />
                          <label htmlFor={`add-item-${key}`} className="flex flex-1 cursor-pointer flex-col">
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
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-5">
          <p className="text-sm text-muted-foreground">{selectedCount} selecionado(s)</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={selectedCount === 0 || isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
