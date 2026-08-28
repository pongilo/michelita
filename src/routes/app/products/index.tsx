import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  ArrowUpDownIcon,
  EditIcon,
  EllipsisVerticalIcon,
  FolderPlusIcon,
  ImageIcon,
  PackagePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { CategoryFormModal, type CategoryFormValues } from "@/components/category-form-modal";
import { CategoryProductsModal } from "@/components/category-products-modal";
import { CategoryProductOrderModal } from "@/components/category-product-order-modal";
import { CategoryOrderModal } from "@/components/category-order-modal";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { useToggleProductActive } from "@/hooks/tanstack/product/use-toggle-product-active";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { useCreateProductCategory } from "@/hooks/tanstack/product-category/use-create-product-category";
import { useUpdateProductCategory } from "@/hooks/tanstack/product-category/use-update-product-category";
import { useDeleteProductCategory } from "@/hooks/tanstack/product-category/use-delete-product-category";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemMedia } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  imageUrl: string | null;
  price: number;
  categoryId: string | null;
  isActive: boolean;
  category: { id: string; name: string } | null;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  displayLimit: number | null;
};

type CategoryGroup = {
  key: string;
  name: string;
  products: Product[];
  displayLimit: number | null;
};

function ProductListItem({
  product,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  return (
    <Item variant="outline" className={cn("bg-background", !product.isActive && "opacity-60")}>
      <ItemMedia className="size-10 flex-none overflow-hidden rounded-lg bg-muted">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
        )}
      </ItemMedia>
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

function CategorySectionHeader({
  name,
  count,
  onManageProducts,
  onOrganizeProducts,
  onOrganizeCategories,
  onEdit,
  onDelete,
  disabled,
}: {
  name: string;
  count: number;
  onManageProducts?: () => void;
  onOrganizeProducts?: () => void;
  onOrganizeCategories?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  const showMenu = onManageProducts || onOrganizeProducts || onOrganizeCategories || onEdit || onDelete;

  return (
    <div className="flex items-center justify-between gap-2 px-1 mb-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className="truncate font-heading text-sm text-foreground">{name}</h3>
        <span className="flex-none text-xs text-muted-foreground">{count}</span>
      </div>
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            disabled={disabled}
            aria-label={`Ações da categoria ${name}`}
          >
            <EllipsisVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onManageProducts && (
              <DropdownMenuItem onClick={onManageProducts}>
                <PackagePlusIcon />
                Adicionar produtos
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <EditIcon />
                Editar categoria
              </DropdownMenuItem>
            )}

            {(onManageProducts || onEdit) && <DropdownMenuSeparator />}

            {onOrganizeProducts && (
              <DropdownMenuItem onClick={onOrganizeProducts}>
                <ArrowUpDownIcon />
                Organizar produtos
              </DropdownMenuItem>
            )}
            {onOrganizeCategories && (
              <DropdownMenuItem onClick={onOrganizeCategories}>
                <ArrowUpDownIcon />
                Organizar categorias
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon />
                  Excluir categoria
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function CategoryProductsList({
  group,
  onEditProduct,
  onDeleteProduct,
  onToggleActive,
  disabled,
}: {
  group: CategoryGroup;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  disabled: boolean;
}) {
  if (group.products.length === 0) {
    return <p className="px-1 text-xs text-muted-foreground">Nenhum produto nesta categoria.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {group.products.map((product, index) => (
        <div key={product.id}>
          <ProductListItem
            product={product}
            onEdit={() => onEditProduct(product)}
            onDelete={() => onDeleteProduct(product)}
            onToggleActive={() => onToggleActive(product)}
            disabled={disabled}
          />
          {group.displayLimit === index + 1 && index + 1 < group.products.length && (
            <div className="flex items-center gap-2 px-1 py-0.5 mt-2.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground">
                Abaixo, estarão no ver mais do cardápio
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CategorySection({
  group,
  onEditCategory,
  onDeleteCategory,
  onManageProducts,
  onOrganizeProducts,
  onOrganizeCategories,
  categoryActionsDisabled,
  onEditProduct,
  onDeleteProduct,
  onToggleActiveProduct,
  productActionsDisabled,
}: {
  group: CategoryGroup;
  onEditCategory?: () => void;
  onDeleteCategory?: () => void;
  onManageProducts?: () => void;
  onOrganizeProducts?: () => void;
  onOrganizeCategories?: () => void;
  categoryActionsDisabled?: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onToggleActiveProduct: (product: Product) => void;
  productActionsDisabled: boolean;
}) {
  return (
    <section>
      <CategorySectionHeader
        name={group.name}
        count={group.products.length}
        onManageProducts={onManageProducts}
        onOrganizeProducts={onOrganizeProducts}
        onOrganizeCategories={onOrganizeCategories}
        onEdit={onEditCategory}
        onDelete={onDeleteCategory}
        disabled={categoryActionsDisabled}
      />
      <CategoryProductsList
        group={group}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleActive={onToggleActiveProduct}
        disabled={productActionsDisabled}
      />
    </section>
  );
}

function ProductsPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
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

  const { mutateAsync: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct({
    organizationId: organization!.id,
  });
  const { mutateAsync: toggleProductActive, isPending: isTogglingActive } = useToggleProductActive({
    organizationId: organization!.id,
  });

  const { mutateAsync: createCategory, isPending: isCreatingCategory } = useCreateProductCategory();
  const { mutateAsync: updateCategory, isPending: isUpdatingCategory } = useUpdateProductCategory({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteCategory, isPending: isDeletingCategory } = useDeleteProductCategory({
    organizationId: organization!.id,
  });

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productsModalCategory, setProductsModalCategory] = useState<Category | null>(null);
  const [productOrderGroup, setProductOrderGroup] = useState<CategoryGroup | null>(null);
  const [isCategoryOrderModalOpen, setIsCategoryOrderModalOpen] = useState(false);

  const isCategorySubmitting = isCreatingCategory || isUpdatingCategory;

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

  async function onCategorySubmit(values: CategoryFormValues) {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...values });
        toast.success("Categoria atualizada com sucesso.");
      } else {
        await createCategory({ organizationId: organization!.id, ...values });
        toast.success("Categoria criada com sucesso.");
      }
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar categoria.");
    }
  }

  function handleStartEditCategory(category: Category) {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  }

  function handleCloseCategoryForm() {
    setIsCategoryFormOpen(false);
    setEditingCategory(null);
  }

  async function handleDeleteCategory(categoryId: string, categoryName: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a categoria "${categoryName}"? Os produtos vinculados ficarão sem categoria.`,
    );
    if (!confirmed) return;

    try {
      await deleteCategory({ id: categoryId, organizationId: organization!.id });
      toast.success("Categoria excluída com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir categoria.");
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
        <main className="mx-auto w-full max-w-4xl px-5 pb-5">
          <header className="sticky top-[env(safe-area-inset-top)] z-20 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
            <AppTitle>Produtos</AppTitle>
          </header>

          <EmptyState>
            <EmptyState.Icon>🧁</EmptyState.Icon>
            <EmptyState.Title>Nenhum produto ainda</EmptyState.Title>
            <EmptyState.Description>
              Cadastre seus produtos para agilizar o preenchimento de pedidos.
            </EmptyState.Description>
            <EmptyState.Action>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" nativeButton={false} render={<Link to="/app/products/new" />}>
                  Novo produto
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingCategory(null); setIsCategoryFormOpen(true); }}>
                  Nova categoria
                </Button>
              </div>
            </EmptyState.Action>
          </EmptyState>
        </main>

        <CategoryFormModal
          isOpen={isCategoryFormOpen}
          mode={editingCategory ? "edit" : "create"}
          isSubmitting={isCategorySubmitting}
          initialValues={
            editingCategory
              ? {
                  name: editingCategory.name,
                  description: editingCategory.description ?? "",
                  displayLimit: editingCategory.displayLimit ?? undefined,
                }
              : undefined
          }
          onClose={handleCloseCategoryForm}
          onSubmit={onCategorySubmit}
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
              size="icon-sm"
              onClick={() => { setEditingCategory(null); setIsCategoryFormOpen(true); }}
              aria-label="Nova categoria"
            >
              <FolderPlusIcon />
            </Button>
            <Button
              size="icon-sm"
              className="hidden md:inline-flex"
              nativeButton={false}
              render={<Link to="/app/products/new" />}
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

      {groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((group) =>
            group.key === NO_CATEGORY_KEY ? (
              <CategorySection
                key={group.key}
                group={group}
                onOrganizeProducts={() => setProductOrderGroup(group)}
                onOrganizeCategories={categories.length > 1 ? () => setIsCategoryOrderModalOpen(true) : undefined}
                onEditProduct={(product) => navigate({ to: "/app/products/$productId", params: { productId: product.id } })}
                onDeleteProduct={(product) => handleDelete(product.id, product.name)}
                onToggleActiveProduct={handleToggleActive}
                productActionsDisabled={isDeletingProduct || isTogglingActive}
              />
            ) : (
              <CategorySection
                key={group.key}
                group={group}
                onEditCategory={() => {
                  const category = categories.find((item) => item.id === group.key);
                  if (category) handleStartEditCategory(category);
                }}
                onDeleteCategory={() => handleDeleteCategory(group.key, group.name)}
                onManageProducts={() => {
                  const category = categories.find((item) => item.id === group.key);
                  if (category) setProductsModalCategory(category);
                }}
                onOrganizeProducts={() => setProductOrderGroup(group)}
                onOrganizeCategories={categories.length > 1 ? () => setIsCategoryOrderModalOpen(true) : undefined}
                categoryActionsDisabled={isDeletingCategory}
                onEditProduct={(product) => navigate({ to: "/app/products/$productId", params: { productId: product.id } })}
                onDeleteProduct={(product) => handleDelete(product.id, product.name)}
                onToggleActiveProduct={handleToggleActive}
                productActionsDisabled={isDeletingProduct || isTogglingActive}
              />
            ),
          )}
        </div>
      )}

      <CategoryFormModal
        isOpen={isCategoryFormOpen}
        mode={editingCategory ? "edit" : "create"}
        isSubmitting={isCategorySubmitting}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description ?? "",
                displayLimit: editingCategory.displayLimit ?? undefined,
              }
            : undefined
        }
        onClose={handleCloseCategoryForm}
        onSubmit={onCategorySubmit}
      />

      <CategoryProductsModal
        isOpen={productsModalCategory !== null}
        category={productsModalCategory}
        organizationId={organization!.id}
        onClose={() => setProductsModalCategory(null)}
      />

      <CategoryProductOrderModal
        isOpen={productOrderGroup !== null}
        category={productOrderGroup ? { id: productOrderGroup.key, name: productOrderGroup.name } : null}
        products={productOrderGroup?.products ?? []}
        organizationId={organization!.id}
        onClose={() => setProductOrderGroup(null)}
      />

      <CategoryOrderModal
        isOpen={isCategoryOrderModalOpen}
        categories={categories}
        organizationId={organization!.id}
        onClose={() => setIsCategoryOrderModalOpen(false)}
      />
    </main>

    <Button
      size="icon"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 size-14 shadow-lg md:hidden"
      nativeButton={false}
      render={<Link to="/app/products/new" />}
    >
      <PlusIcon className="size-6" />
      <span className="sr-only">Novo produto</span>
    </Button>
    </>
  );
}
