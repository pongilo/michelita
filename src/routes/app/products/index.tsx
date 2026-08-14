import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { EditIcon, FolderIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ProductFormModal, type ProductFormValues } from "@/components/product-form-modal";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { normalize } from "@/lib/utils";

export const Route = createFileRoute("/app/products/")({
  component: ProductsPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NO_CATEGORY_KEY = "sem-categoria";

type Product = {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

type CategoryGroup = {
  key: string;
  name: string;
  products: Product[];
};

function ProductsPage() {
  const { organization } = useAuth();
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, error } = useGetProducts({
    organizationId: organization!.id,
  });

  const { data: categoriesData } = useGetProductCategories({
    organizationId: organization!.id,
  });
  const categories = categoriesData?.categories ?? [];

  const allProducts = data?.products ?? [];
  const total = allProducts.length;

  const search = normalize(searchInput.trim());
  const filteredProducts = useMemo(() => {
    if (!search) return allProducts;
    return allProducts.filter((product) => normalize(product.name).includes(search));
  }, [allProducts, search]);

  const groups = useMemo<CategoryGroup[]>(() => {
    const byCategory = new Map<string, Product[]>();
    for (const product of filteredProducts) {
      const key = product.categoryId ?? NO_CATEGORY_KEY;
      const list = byCategory.get(key) ?? [];
      list.push(product);
      byCategory.set(key, list);
    }

    const result: CategoryGroup[] = categories.map((category) => ({
      key: category.id,
      name: category.name,
      products: byCategory.get(category.id) ?? [],
    }));

    result.push({ key: NO_CATEGORY_KEY, name: "Sem categoria", products: byCategory.get(NO_CATEGORY_KEY) ?? [] });

    return search ? result.filter((group) => group.products.length > 0) : result;
  }, [filteredProducts, categories, search]);

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

  async function onSubmit(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          name: values.name,
          price: values.price,
          categoryId: values.categoryId,
        });
        toast.success("Produto atualizado com sucesso.");
      } else {
        await createProduct({
          organizationId: organization!.id,
          name: values.name,
          price: values.price,
          categoryId: values.categoryId,
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

  if (total === 0 && !searchInput) {
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
          categories={categories}
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to="/app/products/categories" />}
            >
              <FolderIcon />
              Categorias
            </Button>
            <Button size="icon-sm" onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
              <PlusIcon />
            </Button>
          </div>
        </div>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Buscar produto" />
      </header>

      {groups.length === 0 && searchInput && (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum produto encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{searchInput}"</EmptyState.Description>
        </EmptyState>
      )}

      {groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="font-heading text-sm text-foreground">{group.name}</h3>
                <span className="text-xs text-muted-foreground">{group.products.length}</span>
              </div>

              {group.products.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Nenhum produto nesta categoria.</p>
              ) : (
                <ItemGroup>
                  {group.products.map((product) => (
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
              )}
            </section>
          ))}
        </div>
      )}

      <ProductFormModal
        isOpen={isFormOpen}
        mode={editingProduct ? "edit" : "create"}
        isSubmitting={isSubmitting}
        categories={categories}
        initialValues={
          editingProduct
            ? { name: editingProduct.name, price: editingProduct.price, categoryId: editingProduct.categoryId ?? undefined }
            : undefined
        }
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    </main>
  );
}
