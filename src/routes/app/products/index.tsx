import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EditIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ProductFormModal, type ProductFormValues } from "@/components/product-form-modal";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";

export const Route = createFileRoute("/app/products/")({
  component: ProductsPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ProductsPage() {
  const { organization } = Route.useRouteContext();
  const { data: products = [], isLoading, isError, error } = useGetProducts({
    organizationId: organization.id,
  });
  const { mutateAsync: createProduct, isPending: isCreatingProduct } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdatingProduct } = useUpdateProduct({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct({
    organizationId: organization.id,
  });

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const editingProduct = products.find((p) => p.id === editingProductId) ?? null;
  const isSubmitting = isCreatingProduct || isUpdatingProduct;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function onSubmit(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, name: values.name, price: values.price });
        toast.success("Produto atualizado com sucesso.");
      } else {
        await createProduct({
          organizationId: organization.id,
          name: values.name,
          price: values.price,
        });
        toast.success("Produto criado com sucesso.");
      }
      setIsFormOpen(false);
      setEditingProductId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  function handleStartEdit(productId: string) {
    setEditingProductId(productId);
    setIsFormOpen(true);
  }

  function handleClose() {
    setIsFormOpen(false);
    setEditingProductId(null);
  }

  async function handleDelete(productId: string, productName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${productName}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await deleteProduct({ id: productId, organizationId: organization.id });
      toast.success("Produto excluído com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir produto.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <LoadingState label="Carregando produtos..." />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <p className="text-destructive">Erro ao carregar produtos: {error.message}</p>
      </main>
    );
  }

  if (products.length === 0) {
    return (
      <>
        <EmptyState>
          <EmptyState.Icon>🧁</EmptyState.Icon>
          <EmptyState.Title>Nenhum produto ainda</EmptyState.Title>
          <EmptyState.Description>
            Cadastre seus produtos para agilizar o preenchimento de pedidos.
          </EmptyState.Description>
          <EmptyState.Action>
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              Novo produto
            </Button>
          </EmptyState.Action>
        </EmptyState>

        <ProductFormModal
          isOpen={isFormOpen}
          mode="create"
          isSubmitting={isSubmitting}
          onClose={handleClose}
          onSubmit={onSubmit}
        />
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-5">
      <header className="space-y-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-heading">Produtos</h1>
            <p className="text-sm text-muted-foreground">
              ({products.length} {products.length === 1 ? "produto cadastrado" : "produtos cadastrados"})
            </p>
          </div>
          <Button size="icon-sm" onClick={() => { setEditingProductId(null); setIsFormOpen(true); }}>
            <PlusIcon />
          </Button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar produto" />
      </header>

      {filteredProducts.length === 0 ? (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum produto encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{search}"</EmptyState.Description>
        </EmptyState>
      ) : (
        <ItemGroup>
          {filteredProducts.map((product) => (
            <Item key={product.id} variant="outline">
              <ItemContent>
                <ItemTitle>{product.name}</ItemTitle>
                <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(product.id)}
                  disabled={isDeletingProduct}
                >
                  <EditIcon />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={isDeletingProduct}
                >
                  <Trash2Icon />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <ProductFormModal
        isOpen={isFormOpen}
        mode={editingProduct ? "edit" : "create"}
        isSubmitting={isSubmitting}
        initialValues={editingProduct ? { name: editingProduct.name, price: editingProduct.price } : undefined}
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    </main>
  );
}
