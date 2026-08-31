import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SettingsIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { ManageSuppliesModal } from "@/components/manage-supplies-modal";
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
  multiplier: number | null;
  onMultiplierChange: (multiplier: number | null) => Promise<void> | void;
  onApplySuggestedPrice: (price: number) => Promise<void> | void;
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

export function ProductSuppliesCard({
  productId,
  organizationId,
  productPrice,
  multiplier,
  onMultiplierChange,
  onApplySuggestedPrice,
}: ProductSuppliesCardProps) {
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [multiplierInput, setMultiplierInput] = useState(multiplier !== null ? String(multiplier) : "");
  const [isManageSuppliesOpen, setIsManageSuppliesOpen] = useState(false);

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
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsManageSuppliesOpen(true)}>
          <SettingsIcon />
          Gerenciar insumos
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Carregando ficha técnica..." />
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
                    <ProductSupplyRow
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

          {items.length > 0 && (
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

          {allSupplies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem insumos cadastrados.{" "}
              <button
                type="button"
                onClick={() => setIsManageSuppliesOpen(true)}
                className="underline underline-offset-4"
              >
                Cadastre um insumo
              </button>{" "}
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

      <ManageSuppliesModal
        isOpen={isManageSuppliesOpen}
        organizationId={organizationId}
        onClose={() => setIsManageSuppliesOpen(false)}
      />
    </div>
  );
}
