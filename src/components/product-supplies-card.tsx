import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useGetProductSupplies } from "@/hooks/tanstack/product-supply/use-get-product-supplies";
import { useAddProductSupply } from "@/hooks/tanstack/product-supply/use-add-product-supply";
import { useUpdateProductSupply } from "@/hooks/tanstack/product-supply/use-update-product-supply";
import { useRemoveProductSupply } from "@/hooks/tanstack/product-supply/use-remove-product-supply";
import { currencyFormatter, unitCostFormatter } from "@/lib/utils/formatter";

type ProductSuppliesCardProps = {
  productId: string;
  organizationId: string;
  productPrice: number;
};

function ProductSupplyRow({
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
    <Item variant="outline" className="bg-background">
      <ItemContent>
        <ItemTitle>{item.supply.name}</ItemTitle>
        <ItemDescription>
          {unitCostFormatter.format(item.supply.costPerUnit)} / {item.supply.unit} · custo de{" "}
          {currencyFormatter.format(lineCost)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-1">
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
        <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={disabled}>
          <Trash2Icon />
        </Button>
      </ItemActions>
    </Item>
  );
}

export function ProductSuppliesCard({ productId, organizationId, productPrice }: ProductSuppliesCardProps) {
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const { data: suppliesData } = useGetSupplies({ organizationId });
  const allSupplies = suppliesData?.supplies ?? [];

  const { data, isLoading } = useGetProductSupplies({ productId });
  const items = useMemo(() => data?.items ?? [], [data]);

  const { mutateAsync: addProductSupply, isPending: isAdding } = useAddProductSupply({ productId });
  const { mutateAsync: updateProductSupply } = useUpdateProductSupply({ productId });
  const { mutateAsync: removeProductSupply, isPending: isRemoving } = useRemoveProductSupply({ productId });

  const availableSupplies = useMemo(() => {
    const usedIds = new Set(items.map((item) => item.supply.id));
    return allSupplies.filter((supply) => !usedIds.has(supply.id));
  }, [allSupplies, items]);

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.supply.costPerUnit, 0);
  const costShare = productPrice > 0 ? totalCost / productPrice : null;

  async function handleAdd() {
    if (!selectedSupplyId) return;
    const parsed = Number(newQuantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    try {
      await addProductSupply({ productId, supplyId: selectedSupplyId, quantity: parsed });
      setSelectedSupplyId("");
      setNewQuantity("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar insumo.");
    }
  }

  async function handleUpdate(id: string, quantity: number) {
    try {
      await updateProductSupply({ id, quantity });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar insumo.");
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeProductSupply({ id, productId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover insumo.");
    }
  }

  const selectedSupplyUnit = allSupplies.find((i) => i.id === selectedSupplyId)?.unit;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Insumos usados neste produto, para ajudar a calcular o custo e o preço de venda.
      </p>

      {isLoading ? (
        <LoadingState label="Carregando ficha técnica..." />
      ) : (
        <>
          {items.length > 0 && (
            <ItemGroup>
              {items.map((item) => (
                <ProductSupplyRow
                  key={item.id}
                  item={item}
                  disabled={isRemoving}
                  onUpdate={(quantity) => handleUpdate(item.id, quantity)}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </ItemGroup>
          )}

          {items.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-dashed px-4 py-3 text-sm">
              <span className="text-muted-foreground">Custo total (CMV)</span>
              <span className="font-medium">
                {currencyFormatter.format(totalCost)}
                {costShare !== null && (
                  <span className="text-muted-foreground"> ({(costShare * 100).toFixed(1)}% do preço)</span>
                )}
              </span>
            </div>
          )}

          {allSupplies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem insumos cadastrados.{" "}
              <Link to="/app/supplies" className="underline underline-offset-4">
                Cadastre um insumo
              </Link>{" "}
              para adicioná-lo aqui.
            </p>
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
  );
}
