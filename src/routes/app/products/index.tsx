import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { EditIcon, FolderIcon, GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { ProductFormModal, type ProductFormValues } from "@/components/product-form-modal";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { useReorderProducts } from "@/hooks/tanstack/product/use-reorder-products";
import { useToggleProductActive } from "@/hooks/tanstack/product/use-toggle-product-active";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { Switch } from "@/components/ui/switch";
import { AppTitle } from "@/components/app-title";
import { cn, normalize } from "@/lib/utils";

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
  description: string | null;
  price: number;
  categoryId: string | null;
  isActive: boolean;
  category: { id: string; name: string } | null;
};

type CategoryGroup = {
  key: string;
  name: string;
  products: Product[];
  displayLimit: number | null;
};

function SortableProductItem({
  product,
  draggable,
  onEdit,
  onDelete,
  onToggleActive,
  onDragStart,
  onDragEnd,
  disabled,
}: {
  product: Product;
  draggable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  disabled: boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Item
      variant="outline"
      className={cn("bg-background", !product.isActive && "opacity-60")}
      render={
        <Reorder.Item
          value={product}
          dragListener={false}
          dragControls={dragControls}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      }
    >
      {draggable && (
        <button
          type="button"
          className="flex-none cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
          aria-label="Arrastar para reordenar"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      )}
      <ItemContent>
        <ItemTitle>
          {product.name}
          {!product.isActive && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
              Inativo
            </span>
          )}
        </ItemTitle>
        {product.description && <ItemDescription>{product.description}</ItemDescription>}
        <ItemDescription>{currencyFormatter.format(product.price)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={product.isActive}
          onCheckedChange={onToggleActive}
          disabled={disabled}
          aria-label={product.isActive ? "Desativar produto" : "Ativar produto"}
        />
        <Button size="icon-sm" variant="ghost" onClick={onEdit} disabled={disabled}>
          <EditIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onDelete} disabled={disabled}>
          <Trash2Icon />
        </Button>
      </ItemActions>
    </Item>
  );
}

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
      displayLimit: category.displayLimit ?? null,
    }));

    result.push({
      key: NO_CATEGORY_KEY,
      name: "Sem categoria",
      products: byCategory.get(NO_CATEGORY_KEY) ?? [],
      displayLimit: null,
    });

    return search ? result.filter((group) => group.products.length > 0) : result;
  }, [filteredProducts, categories, search]);

  const [localGroups, setLocalGroups] = useState<CategoryGroup[]>([]);
  const localGroupsRef = useRef<CategoryGroup[]>([]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    localGroupsRef.current = localGroups;
  }, [localGroups]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setLocalGroups(groups);
  }, [groups]);

  const { mutateAsync: createProduct, isPending: isCreatingProduct } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdatingProduct } = useUpdateProduct({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct({
    organizationId: organization!.id,
  });
  const { mutateAsync: reorderProducts } = useReorderProducts({
    organizationId: organization!.id,
  });
  const { mutateAsync: toggleProductActive, isPending: isTogglingActive } = useToggleProductActive({
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
          description: values.description,
          price: values.price,
          categoryId: values.categoryId,
        });
        toast.success("Produto atualizado com sucesso.");
      } else {
        await createProduct({
          organizationId: organization!.id,
          name: values.name,
          description: values.description,
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

  async function handleToggleActive(product: Product) {
    try {
      await toggleProductActive({
        id: product.id,
        organizationId: organization!.id,
        isActive: !product.isActive,
      });
      toast.success(product.isActive ? "Produto desativado do cardápio." : "Produto ativado no cardápio.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar produto.");
    }
  }

  async function handleGroupDragEnd(groupKey: string) {
    isDraggingRef.current = false;
    const group = localGroupsRef.current.find((g) => g.key === groupKey);
    if (!group) return;

    try {
      await reorderProducts({
        organizationId: organization!.id,
        orderedIds: group.products.map((product) => product.id),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar produtos.");
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
    <>
    <main className="mx-auto w-full max-w-4xl px-5 pb-24 md:pb-5">
      <header className="sticky top-[env(safe-area-inset-top)] z-20 space-y-4 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
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
            <Button
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
            >
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

      {localGroups.length > 0 && (
        <div className="space-y-5">
          {!search && (
            <p className="text-xs text-muted-foreground -mt-3">
              Arraste pelo ícone para reordenar os produtos dentro de cada categoria.
            </p>
          )}

          {localGroups.map((group) => (
            <section key={group.key}>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="font-heading text-sm text-foreground">{group.name}</h3>
                <span className="text-xs text-muted-foreground">{group.products.length}</span>
              </div>

              {group.products.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Nenhum produto nesta categoria.</p>
              ) : (
                <Reorder.Group
                  as="div"
                  axis="y"
                  values={group.products}
                  onReorder={(newProducts) => {
                    setLocalGroups((prev) =>
                      prev.map((g) => (g.key === group.key ? { ...g, products: newProducts } : g)),
                    );
                  }}
                  className="flex w-full flex-col gap-2.5"
                >
                  {group.products.map((product, index) => (
                    <Fragment key={product.id}>
                      <SortableProductItem
                        product={product}
                        draggable={!search}
                        onEdit={() => handleStartEdit(product)}
                        onDelete={() => handleDelete(product.id, product.name)}
                        onToggleActive={() => handleToggleActive(product)}
                        onDragStart={() => { isDraggingRef.current = true; }}
                        onDragEnd={() => handleGroupDragEnd(group.key)}
                        disabled={isDeletingProduct || isTogglingActive}
                      />
                      {group.displayLimit === index + 1 && index + 1 < group.products.length && (
                        <div className="flex items-center gap-2 px-1 py-0.5">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[10px] text-muted-foreground">
                            Abaixo, estarão no ver mais do cardápio
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </Reorder.Group>
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
            ? {
                name: editingProduct.name,
                description: editingProduct.description ?? undefined,
                price: editingProduct.price,
                categoryId: editingProduct.categoryId ?? undefined,
              }
            : undefined
        }
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    </main>

    <Button
      size="icon"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 size-14 shadow-lg md:hidden"
      onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
    >
      <PlusIcon className="size-6" />
      <span className="sr-only">Novo produto</span>
    </Button>
    </>
  );
}
