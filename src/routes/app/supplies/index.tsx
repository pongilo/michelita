import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { EditIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { SupplyFormModal, type SupplyFormValues } from "@/components/supply-form-modal";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useCreateSupply } from "@/hooks/tanstack/supply/use-create-supply";
import { useUpdateSupply } from "@/hooks/tanstack/supply/use-update-supply";
import { useDeleteSupply } from "@/hooks/tanstack/supply/use-delete-supply";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { normalize } from "@/lib/utils";
import { unitCostFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/supplies/")({
  component: SuppliesPage,
});

type Supply = {
  id: string;
  name: string;
  unit: string;
  purchasePrice: number;
  purchaseQuantity: number;
  costPerUnit: number;
};

function SuppliesPage() {
  const { organization } = useAuth();
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, error } = useGetSupplies({
    organizationId: organization!.id,
  });

  const allSupplies = data?.supplies ?? [];
  const total = allSupplies.length;

  const supplies = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return allSupplies;
    return allSupplies.filter((supply) => normalize(supply.name).includes(search));
  }, [allSupplies, searchInput]);

  const { mutateAsync: createSupply, isPending: isCreating } = useCreateSupply();
  const { mutateAsync: updateSupply, isPending: isUpdating } = useUpdateSupply({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteSupply, isPending: isDeleting } = useDeleteSupply({
    organizationId: organization!.id,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const isSubmitting = isCreating || isUpdating;

  function handleStartCreate() {
    setEditingSupply(null);
    setIsFormOpen(true);
  }

  function handleStartEdit(supply: Supply) {
    setEditingSupply(supply);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingSupply(null);
  }

  async function onSubmit(values: SupplyFormValues) {
    try {
      if (editingSupply) {
        await updateSupply({ id: editingSupply.id, ...values });
        toast.success("Insumo atualizado com sucesso.");
      } else {
        await createSupply({ organizationId: organization!.id, ...values });
        toast.success("Insumo criado com sucesso.");
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar insumo.");
    }
  }

  async function handleDelete(supply: Supply) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o insumo "${supply.name}"? Ele será removido da ficha técnica dos produtos vinculados.`,
    );
    if (!confirmed) return;

    try {
      await deleteSupply({ id: supply.id, organizationId: organization!.id });
      toast.success("Insumo excluído com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir insumo.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <LoadingState label="Carregando insumos..." />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <p className="text-destructive">Erro ao carregar insumos: {error.message}</p>
      </main>
    );
  }

  if (total === 0 && !searchInput) {
    return (
      <>
        <main className="mx-auto w-full max-w-4xl px-5 pb-5">
          <header className="sticky top-0 z-20 bg-background pt-[calc(env(safe-area-inset-top)+1.25rem)] mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
            <AppTitle>Insumos</AppTitle>
          </header>

          <EmptyState>
            <EmptyState.Icon>🌾</EmptyState.Icon>
            <EmptyState.Title>Nenhum insumo ainda</EmptyState.Title>
            <EmptyState.Description>
              Cadastre os insumos que você compra para montar a ficha técnica dos seus produtos.
            </EmptyState.Description>
            <EmptyState.Action>
              <Button size="sm" onClick={handleStartCreate}>
                Novo insumo
              </Button>
            </EmptyState.Action>
          </EmptyState>
        </main>

        <SupplyFormModal
          isOpen={isFormOpen}
          mode={editingSupply ? "edit" : "create"}
          isSubmitting={isSubmitting}
          initialValues={editingSupply ?? undefined}
          onClose={handleCloseForm}
          onSubmit={onSubmit}
        />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 md:pb-5">
        <header className="sticky top-0 z-20 space-y-4 bg-background pt-[calc(env(safe-area-inset-top)+1.25rem)] mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-baseline gap-2">
              <AppTitle>Insumos</AppTitle>
              <p className="text-sm text-muted-foreground">
                ({total} {total === 1 ? "insumo cadastrado" : "insumos cadastrados"})
              </p>
            </div>
            <Button size="icon-sm" className="hidden md:inline-flex" onClick={handleStartCreate}>
              <PlusIcon />
            </Button>
          </div>
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Buscar insumo" />
        </header>

        {supplies.length === 0 && searchInput && (
          <EmptyState compact>
            <EmptyState.Icon>🔍</EmptyState.Icon>
            <EmptyState.Title>Nenhum insumo encontrado</EmptyState.Title>
            <EmptyState.Description>Nenhum resultado para "{searchInput}"</EmptyState.Description>
          </EmptyState>
        )}

        {supplies.length > 0 && (
          <ItemGroup>
            {supplies.map((supply) => (
              <Item key={supply.id} variant="outline" className="bg-background">
                <ItemContent>
                  <ItemTitle>{supply.name}</ItemTitle>
                  <ItemDescription>
                    {unitCostFormatter.format(supply.costPerUnit)} / {supply.unit}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleStartEdit(supply)} disabled={isDeleting}>
                    <EditIcon />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(supply)} disabled={isDeleting}>
                    <Trash2Icon />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}

        <SupplyFormModal
          isOpen={isFormOpen}
          mode={editingSupply ? "edit" : "create"}
          isSubmitting={isSubmitting}
          initialValues={editingSupply ?? undefined}
          onClose={handleCloseForm}
          onSubmit={onSubmit}
        />
      </main>

      <Button
        size="icon"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 size-14 shadow-lg md:hidden"
        onClick={handleStartCreate}
      >
        <PlusIcon className="size-6" />
        <span className="sr-only">Novo insumo</span>
      </Button>
    </>
  );
}
