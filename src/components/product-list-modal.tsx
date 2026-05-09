import { useState } from "react";
import { useFieldArray, useFormContext, useForm, Controller } from "react-hook-form";
import { useQueryState } from "nuqs";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { currencyFormatter } from "@/lib/utils/formatter";
import { normalize } from "@/lib/utils";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

type ProductListContentProps = {
  organizationId: string;
  deliveryDate: string;
  onClose: () => void;
};

const customItemSchema = z.object({
  description: z.string().trim().min(1, "Informe uma descrição."),
  quantity: z.number().min(1, "Quantidade mínima é 1."),
  unitPrice: z.number().min(0, "O valor deve ser maior ou igual a zero."),
  note: z.string().optional(),
  addToCatalog: z.boolean(),
});

type CustomItemForm = z.infer<typeof customItemSchema>;

export function ProductListContent({ organizationId, deliveryDate, onClose }: ProductListContentProps) {
  const [search, setSearch] = useState("");
  const { control, setValue, watch } = useFormContext<CreateOrderInput>();

  const { fields: items, append: appendItem, remove: removeItem } = useFieldArray({ control, name: "items" });

  const itemsWatched = watch("items", items);
  const total = itemsWatched.reduce(
    (acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );
  const totalItems = itemsWatched.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  function handleClose() {
    setSearch("");
    onClose();
  }

  const { data, isLoading } = useGetProducts({ organizationId });
  const products = data?.products ?? [];
  const { mutateAsync: createProduct, isPending: isCreatingProduct } = useCreateProduct();

  const filteredProducts = products.filter((p) =>
    normalize(p.name).includes(normalize(search))
  );

  const customForm = useForm<CustomItemForm>({
    resolver: zodResolver(customItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unitPrice: 0,
      note: "",
      addToCatalog: false,
    },
  });

  const customProductTotal = (customForm.watch('unitPrice') * customForm.watch('quantity')) || 0;
  const watchedQuantity = customForm.watch("quantity");

  async function onAddCustomItem(values: CustomItemForm) {
    if (values.addToCatalog) {
      try {
        await createProduct({
          organizationId,
          name: values.description,
          price: values.unitPrice,
        });
        toast.success("Produto adicionado ao catálogo.");
      } catch {
        toast.error("Erro ao adicionar produto ao catálogo.");
        return;
      }
    }

    appendItem({
      description: values.description,
      unitPrice: values.unitPrice,
      quantity: values.quantity,
      deliveredAt: deliveryDate,
      note: values.note ?? "",
      isDelivered: false,
    });

    customForm.reset();
    handleClose();
  }

  return (
    <Tabs defaultValue="catalog" className="px-5 max-sm:pt-5">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="catalog" className="flex-1">Catálogo</TabsTrigger>
        <TabsTrigger value="custom" className="flex-1">Produto personalizado</TabsTrigger>
      </TabsList>

      <TabsContent value="catalog">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
        />

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
                      {inCart ? (
                        <ItemDescription>{itemsWatched[itemIndex].quantity} x {currencyFormatter.format(product.price)} = {currencyFormatter.format(itemsWatched[itemIndex].quantity * product.price)}</ItemDescription>
                      ) : (
                        <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
                      )}
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
        <div className="flex items-center py-5 border-t sticky bottom-0 bg-white z-20">
          <div className="flex-1 space-y-1">
            <p className="text-base font-heading text-foreground">Total: {currencyFormatter.format(total)}</p>
            <p className="text-sm font-heading text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
          </div>
          <div className="flex-none">
            <Button type="button" className="w-40" onClick={handleClose} size="lg">
              Concluir
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="custom">
        <form onSubmit={customForm.handleSubmit(onAddCustomItem)} className="flex flex-col overflow-y-auto flex-1">
          <div className="space-y-4 flex-1 pb-8">
            <Field>
              <FieldLabel>Descrição</FieldLabel>
              <Input
                placeholder="Ex: Bolo de chocolate"
                {...customForm.register("description")}
              />
              <FieldError>{customForm.formState.errors.description?.message}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Quantidade</FieldLabel>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => customForm.setValue("quantity", Math.max(1, watchedQuantity - 1))}
                  >
                    <MinusIcon />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    {...customForm.register("quantity", { valueAsNumber: true })}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => customForm.setValue("quantity", watchedQuantity + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                <FieldError>{customForm.formState.errors.quantity?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Valor unitário</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  {...customForm.register("unitPrice", { valueAsNumber: true })}
                />
                <FieldError>{customForm.formState.errors.unitPrice?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>Observação (opcional)</FieldLabel>
              <Textarea rows={3} placeholder="Escreva uma observação..." {...customForm.register("note")} />
            </Field>

            <Field orientation="horizontal">
              <Controller
                name="addToCatalog"
                control={customForm.control}
                render={({ field }) => (
                  <Checkbox
                    id="addToCatalog"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="addToCatalog">Adicionar ao catálogo de produtos</Label>
            </Field>
          </div>
          <div className="flex items-center py-5 border-t sticky bottom-0 bg-white z-20">
            <div className="flex-1 space-y-1">
              <p className="text-base font-heading text-foreground">Total: {currencyFormatter.format(customProductTotal)}</p>
            </div>
            <div className="flex-none">
              <Button type="submit" disabled={isCreatingProduct} className="w-40">
                {isCreatingProduct ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}

type ProductListModalProps = {
  organizationId: string;
  deliveryDate: string;
};

export function ProductListModal({ organizationId, deliveryDate }: ProductListModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const isOpen = modal === "product";
  const onClose = () => setModal(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="mb-0 p-5">
          <DialogTitle>Adicionar item</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          <ProductListContent organizationId={organizationId} deliveryDate={deliveryDate} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
