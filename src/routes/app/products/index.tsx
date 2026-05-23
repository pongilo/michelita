import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { EditIcon, PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { ProductFormModal, type ProductFormValues } from "@/components/product-form-modal";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { useQueryState, parseAsInteger } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/app/products/")({
  component: ProductsPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Product = { id: string; name: string; price: number };

const PAGE_SIZE = 20;

function ProductsPage() {
  const { organization } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const { data, isLoading, isError, error, isFetching } = useGetProducts({
    organizationId: organization!.id,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { mutateAsync: createProduct, isPending: isCreatingProduct } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdatingProduct } = useUpdateProduct({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct({
    organizationId: organization!.id,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isSubmitting = isCreatingProduct || isUpdatingProduct;

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  async function onSubmit(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, name: values.name, price: values.price });
        toast.success("Produto atualizado com sucesso.");
      } else {
        await createProduct({
          organizationId: organization!.id,
          name: values.name,
          price: values.price,
        });
        toast.success("Produto criado com sucesso.");
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  function handleStartEdit(product: Product) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function handleClose() {
    setIsFormOpen(false);
    setEditingProduct(null);
  }

  async function handleDelete(productId: string, productName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${productName}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await deleteProduct({ id: productId, organizationId: organization!.id });
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

  if (total === 0 && !debouncedSearch) {
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
            <AppTitle>Produtos</AppTitle>
            <p className="text-sm text-muted-foreground">
              ({total} {total === 1 ? "produto cadastrado" : "produtos cadastrados"})
            </p>
          </div>
          <Button size="icon-sm" onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
            <PlusIcon />
          </Button>
        </div>
        <SearchInput value={searchInput} onChange={handleSearchChange} placeholder="Buscar produto" />
      </header>

      {products.length === 0 && debouncedSearch && (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum produto encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{debouncedSearch}"</EmptyState.Description>
        </EmptyState>
      )}

      {products.length > 0 && (
        <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
          <ItemGroup>
            {products.map((product) => (
              <Item key={product.id} variant="outline">
                <ItemContent>
                  <ItemTitle>{product.name}</ItemTitle>
                  <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(product)}
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
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
