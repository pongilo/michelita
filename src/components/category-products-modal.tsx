import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Item, ItemGroup, ItemDescription, ItemTitle } from "@/components/ui/item";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { normalize } from "@/lib/utils";

type ProductsTab = "uncategorized" | "all";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type CategoryProductsModalProps = {
  isOpen: boolean;
  category: { id: string; name: string } | null;
  organizationId: string;
  onClose: () => void;
};

export function CategoryProductsModal({ isOpen, category, organizationId, onClose }: CategoryProductsModalProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ProductsTab>("uncategorized");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useGetProducts({ organizationId });
  const allProducts = useMemo(() => data?.products ?? [], [data]);

  const { mutateAsync: updateProduct } = useUpdateProduct({ organizationId });

  useEffect(() => {
    if (!isOpen || !category) return;
    setSearch("");
    setActiveTab("uncategorized");
    setSelectedIds(new Set(allProducts.filter((product) => product.categoryId === category.id).map((product) => product.id)));
  }, [isOpen, category, allProducts]);

  const tabProducts = useMemo(() => {
    if (activeTab === "uncategorized") {
      return allProducts.filter((product) => product.categoryId === null);
    }
    return allProducts;
  }, [allProducts, activeTab]);

  const filteredProducts = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return tabProducts;
    return tabProducts.filter((product) => normalize(product.name).includes(term));
  }, [tabProducts, search]);

  function toggleProduct(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!category) return;

    const changedProducts = allProducts.filter((product) => {
      const willBeSelected = selectedIds.has(product.id);
      const wasSelected = product.categoryId === category.id;
      return willBeSelected !== wasSelected;
    });

    if (changedProducts.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        changedProducts.map((product) =>
          updateProduct({
            id: product.id,
            name: product.name,
            price: product.price,
            categoryId: selectedIds.has(product.id) ? category.id : undefined,
          }),
        ),
      );
      toast.success("Produtos da categoria atualizados.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produtos da categoria.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Produtos em {category?.name}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3">
          <Tabs value={activeTab} onValueChange={(value) => value && setActiveTab(value as ProductsTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="uncategorized" className="flex-1">Sem categoria</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">Todos os produtos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-5 pb-3">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar produto"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <LoadingState label="Carregando produtos..." />
          ) : filteredProducts.length === 0 ? (
            <EmptyState compact>
              <EmptyState.Icon>🔍</EmptyState.Icon>
              <EmptyState.Title>
                {search
                  ? "Nenhum produto encontrado"
                  : activeTab === "uncategorized"
                    ? "Nenhum produto sem categoria"
                    : "Nenhum produto cadastrado"}
              </EmptyState.Title>
            </EmptyState>
          ) : (
            <ItemGroup>
              {filteredProducts.map((product) => (
                <Item key={product.id} variant="outline" size="sm">
                  <Checkbox
                    id={`category-product-${product.id}`}
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <label htmlFor={`category-product-${product.id}`} className="flex flex-1 cursor-pointer flex-col">
                    <ItemTitle>{product.name}</ItemTitle>
                    <ItemDescription>
                      {currencyFormatter.format(product.price)}
                      {product.category && product.category.id !== category?.id && ` · ${product.category.name}`}
                    </ItemDescription>
                  </label>
                </Item>
              ))}
            </ItemGroup>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-5">
          <p className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
