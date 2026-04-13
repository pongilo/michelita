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
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

type ProductListModalProps = {
  organizationId: string;
  deliveryDate: string;
};

export function ProductListModal({ organizationId, deliveryDate }: ProductListModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const [search, setSearch] = useState("");
  const { control, setValue, watch } = useFormContext<CreateOrderInput>();

  const { fields: items, append: appendItem, remove: removeItem } = useFieldArray({ control, name: "items" });

  const itemsWatched = watch("items", items);
  const total = itemsWatched.reduce(
    (acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );
  const totalItems = itemsWatched.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  const isOpen = modal === "product";

  function onClose() {
    setModal(null);
    setSearch("");
  }

  const { data: products = [], isLoading } = useGetProducts({ organizationId });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
              {filteredProducts.map((product, i) => {
                const itemIndex = itemsWatched.findIndex((item) => item.description === product.name);
                const inCart = itemIndex !== -1;

                return (
                  <div key={product.id}>
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>{product.name}</ItemTitle>
                        <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
                      </ItemContent>
                      <ItemActions className="flex items-center gap-1">
                        {inCart && (
                          <>
                            {itemsWatched[itemIndex].quantity === 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => removeItem(itemIndex)}
                              >
                                <Trash2Icon />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => setValue(`items.${itemIndex}.quantity`, itemsWatched[itemIndex].quantity - 1)}
                              >
                                <MinusIcon />
                              </Button>
                            )}
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {itemsWatched[itemIndex].quantity}
                            </span>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => {
                            if (inCart) {
                              setValue(`items.${itemIndex}.quantity`, itemsWatched[itemIndex].quantity + 1);
                            } else {
                              appendItem({
                                description: product.name,
                                unitPrice: product.price,
                                quantity: 1,
                                deliveredAt: deliveryDate,
                                note: "",
                                isDelivered: false,
                              });
                            }
                          }}
                        >
                          <PlusIcon />
                        </Button>
                      </ItemActions>
                    </Item>
                    {i < filteredProducts.length - 1 && <ItemSeparator />}
                  </div>
                );
              })}
            </ItemGroup>
          )}
        </div>

        <div className="flex items-center">
          <div className="flex-1 space-y-1">
            <p className="text-base font-heading text-foreground">Total: {currencyFormatter.format(total)}</p>
            <p className="text-sm font-heading text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
          </div>
          <div className="flex-none">
            <Button type="button" className="w-40" onClick={onClose} size="lg">
              Concluir
            </Button>
          </div>
        </div>

        
      </DialogContent>
    </Dialog>
  );
}
