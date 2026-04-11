import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useQueryState } from "nuqs";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { currencyFormatter } from "@/lib/utils/formatter";
import { MinusIcon, PlusIcon } from "lucide-react";

type ProductListModalProps = {
  organizationId: string;
  deliveryDate: string;
};

export function ProductListModal({ organizationId, deliveryDate }: ProductListModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { control } = useFormContext<CreateOrderInput>();

  const { append: appendItem } = useFieldArray({ control, name: "items" });

  const isOpen = modal === "product";

  function onClose() {
    setModal(null);
    setSearch("");
    setQuantities({});
  }

  const { data: products = [], isLoading } = useGetProducts({ organizationId });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function getQty(productId: string) {
    return quantities[productId] ?? 0;
  }

  function setQty(productId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  function handleAdd() {
    for (const product of filteredProducts) {
      const qty = getQty(product.id);
      if (qty > 0) {
        appendItem({
          description: product.name,
          unitPrice: product.price,
          quantity: qty,
          deliveredAt: deliveryDate,
          note: "",
          isDelivered: false,
        });
      }
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg sm:h-auto sm:max-h-[80vh] max-w-screen h-screen flex flex-col max-sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Catalogo de produtos</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto relative">
          <div className="sticky top-0 z-10 bg-background pb-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
            />
          </div>

          {isLoading ? (
            <LoadingState label="Carregando produtos..." />
          ) : filteredProducts.length === 0 ? (
            <EmptyState compact>
              <EmptyState.Icon>🔍</EmptyState.Icon>
              <EmptyState.Title>
                {search ? `Nenhum resultado para "${search}"` : "Nenhum produto encontrado"}
              </EmptyState.Title>
            </EmptyState>
          ) : (
            <ItemGroup>
              {filteredProducts.map((product, i) => (
                <div key={product.id}>
                  <Item size="xs">
                    <ItemContent>
                      <ItemTitle>{product.name}</ItemTitle>
                      <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {getQty(product.id) !== 0 && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setQty(product.id, getQty(product.id) - 1)}
                            >
                              <MinusIcon />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {getQty(product.id)}
                            </span>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setQty(product.id, getQty(product.id) + 1)}
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                    </ItemActions>
                  </Item>
                  {i < filteredProducts.length - 1 && <ItemSeparator />}
                </div>
              ))}
            </ItemGroup>
          )}
        </div>

        <Button type="button" className="w-full" onClick={handleAdd} disabled={filteredProducts.every((p) => getQty(p.id) === 0)}>
          Aplicar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
