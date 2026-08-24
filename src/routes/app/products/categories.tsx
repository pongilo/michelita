import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { ArrowLeftIcon, EditIcon, GripVerticalIcon, PackagePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { CategoryFormModal, type CategoryFormValues } from "@/components/category-form-modal";
import { CategoryProductsModal } from "@/components/category-products-modal";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { useCreateProductCategory } from "@/hooks/tanstack/product-category/use-create-product-category";
import { useUpdateProductCategory } from "@/hooks/tanstack/product-category/use-update-product-category";
import { useDeleteProductCategory } from "@/hooks/tanstack/product-category/use-delete-product-category";
import { useReorderProductCategories } from "@/hooks/tanstack/product-category/use-reorder-product-categories";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";

export const Route = createFileRoute("/app/products/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  displayLimit: number | null;
};

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
  onManageProducts,
  onDragStart,
  onDragEnd,
  disabled,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  onManageProducts: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  disabled: boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Item
      variant="outline"
      className="bg-background"
      render={
        <Reorder.Item
          value={category}
          dragListener={false}
          dragControls={dragControls}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      }
    >
      <button
        type="button"
        className="flex-none cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label="Arrastar para reordenar"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <ItemContent>
        <ItemTitle>{category.name}</ItemTitle>
        {category.description && <ItemDescription>{category.description}</ItemDescription>}
        {category.displayLimit && (
          <ItemDescription>Mostra {category.displayLimit} produto(s) no cardápio</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Button size="icon-sm" variant="ghost" onClick={onManageProducts} disabled={disabled} aria-label="Adicionar produtos">
          <PackagePlusIcon />
        </Button>
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

function CategoriesPage() {
  const { organization } = useAuth();

  const { data, isLoading, isError, error } = useGetProductCategories({
    organizationId: organization!.id,
  });

  const [items, setItems] = useState<Category[]>([]);
  const itemsRef = useRef<Category[]>([]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setItems(data?.categories ?? []);
  }, [data]);

  const total = items.length;

  const { mutateAsync: createCategory, isPending: isCreatingCategory } = useCreateProductCategory();
  const { mutateAsync: updateCategory, isPending: isUpdatingCategory } = useUpdateProductCategory({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteCategory, isPending: isDeletingCategory } = useDeleteProductCategory({
    organizationId: organization!.id,
  });
  const { mutateAsync: reorderCategories } = useReorderProductCategories({
    organizationId: organization!.id,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productsModalCategory, setProductsModalCategory] = useState<Category | null>(null);

  const isSubmitting = isCreatingCategory || isUpdatingCategory;

  async function onSubmit(values: CategoryFormValues) {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...values });
        toast.success("Categoria atualizada com sucesso.");
      } else {
        await createCategory({ organizationId: organization!.id, ...values });
        toast.success("Categoria criada com sucesso.");
      }
      setIsFormOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar categoria.");
    }
  }

  function handleStartEdit(category: Category) {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  function handleClose() {
    setIsFormOpen(false);
    setEditingCategory(null);
  }

  async function handleDelete(categoryId: string, categoryName: string) {
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

  async function handleDragEnd() {
    isDraggingRef.current = false;
    try {
      await reorderCategories({
        organizationId: organization!.id,
        orderedIds: itemsRef.current.map((category) => category.id),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar categorias.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <LoadingState label="Carregando categorias..." />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <p className="text-destructive">Erro ao carregar categorias: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-5">
      <header className="sticky top-[env(safe-area-inset-top)] z-20 space-y-4 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/app/products" />}
        >
          <ArrowLeftIcon />
          Voltar para produtos
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <AppTitle>Categorias</AppTitle>
            <p className="text-sm text-muted-foreground">
              ({total} {total === 1 ? "categoria cadastrada" : "categorias cadastradas"})
            </p>
          </div>
          <Button size="icon-sm" onClick={() => { setEditingCategory(null); setIsFormOpen(true); }}>
            <PlusIcon />
          </Button>
        </div>
      </header>

      {total === 0 ? (
        <EmptyState>
          <EmptyState.Icon>🗂️</EmptyState.Icon>
          <EmptyState.Title>Nenhuma categoria ainda</EmptyState.Title>
          <EmptyState.Description>
            Crie categorias para organizar os produtos do seu catálogo.
          </EmptyState.Description>
          <EmptyState.Action>
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              Nova categoria
            </Button>
          </EmptyState.Action>
        </EmptyState>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            Arraste pelo ícone para reordenar as categorias.
          </p>
          <Reorder.Group
            as="div"
            axis="y"
            values={items}
            onReorder={setItems}
            className="flex w-full flex-col gap-2.5"
          >
            {items.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                onEdit={() => handleStartEdit(category)}
                onDelete={() => handleDelete(category.id, category.name)}
                onManageProducts={() => setProductsModalCategory(category)}
                onDragStart={() => { isDraggingRef.current = true; }}
                onDragEnd={handleDragEnd}
                disabled={isDeletingCategory}
              />
            ))}
          </Reorder.Group>
        </>
      )}

      <CategoryFormModal
        isOpen={isFormOpen}
        mode={editingCategory ? "edit" : "create"}
        isSubmitting={isSubmitting}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description ?? "",
                displayLimit: editingCategory.displayLimit ?? undefined,
              }
            : undefined
        }
        onClose={handleClose}
        onSubmit={onSubmit}
      />

      <CategoryProductsModal
        isOpen={productsModalCategory !== null}
        category={productsModalCategory}
        organizationId={organization!.id}
        onClose={() => setProductsModalCategory(null)}
      />
    </main>
  );
}
