import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { SupplyForm, type SupplyFormValues } from "@/components/supply-form";
import { useGetSupplies } from "@/hooks/tanstack/supply/use-get-supplies";
import { useCreateSupply } from "@/hooks/tanstack/supply/use-create-supply";
import { useUpdateSupply } from "@/hooks/tanstack/supply/use-update-supply";
import { useDeleteSupply } from "@/hooks/tanstack/supply/use-delete-supply";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { normalize } from "@/lib/utils";
import { currencyFormatter, unitCostFormatter } from "@/lib/utils/formatter";

type Supply = {
  id: string;
  name: string;
  unit: string;
  purchasePrice: number;
  purchaseQuantity: number;
  costPerUnit: number;
  isIngredient: boolean;
};

type SupplyFormMeta = { title: string; onCancel: () => void };
type SupplyContext = "ingredient" | "other";

type SuppliesManagerProps = {
  organizationId: string;
  showFormHeader?: boolean;
  autoCreate?: boolean;
  context?: SupplyContext;
  onViewChange?: (view: "list" | "form", meta?: SupplyFormMeta) => void;
};

export function SuppliesManager({
  organizationId,
  showFormHeader = true,
  autoCreate = false,
  context,
  onViewChange,
}: SuppliesManagerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [view, setView] = useState<"list" | "form">(autoCreate ? "form" : "list");
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

  const createTitle = "Novo insumo";
  const editTitle =
    context === "ingredient" ? "Editar ingrediente" : context === "other" ? "Editar item" : "Editar insumo";

  useEffect(() => {
    if (view === "form") {
      onViewChange?.("form", { title: editingSupply ? editTitle : createTitle, onCancel: handleCancelForm });
    } else {
      onViewChange?.("list");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, editingSupply, onViewChange, createTitle, editTitle]);

  const { data, isLoading } = useGetSupplies({ organizationId });
  const contextSupplies = useMemo(() => {
    const all = data?.supplies ?? [];
    if (!context) return all;
    return all.filter((supply) => (context === "ingredient" ? supply.isIngredient : !supply.isIngredient));
  }, [data, context]);
  const total = contextSupplies.length;

  const supplies = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return contextSupplies;
    return contextSupplies.filter((supply) => normalize(supply.name).includes(search));
  }, [contextSupplies, searchInput]);

  const { mutateAsync: createSupply, isPending: isCreating } = useCreateSupply();
  const { mutateAsync: updateSupply, isPending: isUpdating } = useUpdateSupply({ organizationId });
  const { mutateAsync: deleteSupply, isPending: isDeleting } = useDeleteSupply({ organizationId });
  const isSubmitting = isCreating || isUpdating;

  function handleStartCreate() {
    setEditingSupply(null);
    setView("form");
  }

  function handleStartEdit(supply: Supply) {
    setEditingSupply(supply);
    setView("form");
  }

  function handleCancelForm() {
    setView("list");
    setEditingSupply(null);
  }

  async function onSubmit(values: SupplyFormValues) {
    try {
      if (editingSupply) {
        await updateSupply({ id: editingSupply.id, ...values });
        toast.success("Insumo atualizado com sucesso.");
      } else {
        await createSupply({ organizationId, ...values });
        toast.success("Insumo criado com sucesso.");
      }
      setView("list");
      setEditingSupply(null);
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
      await deleteSupply({ id: supply.id, organizationId });
      toast.success("Insumo excluído com sucesso.");
      setView("list");
      setEditingSupply(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir insumo.");
    }
  }

  if (view === "form") {
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {showFormHeader && (
          <div className="flex items-center gap-2 pb-3">
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleCancelForm} aria-label="Voltar">
              <ArrowLeftIcon />
            </Button>
            <h4 className="font-heading text-sm font-medium">{editingSupply ? editTitle : createTitle}</h4>
          </div>
        )}

        <SupplyForm
          mode={editingSupply ? "edit" : "create"}
          isSubmitting={isSubmitting}
          initialValues={editingSupply ?? undefined}
          defaultIsIngredient={context !== "other"}
          onCancel={handleCancelForm}
          onSubmit={onSubmit}
          onDelete={editingSupply ? () => handleDelete(editingSupply) : undefined}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 pb-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar insumo"
          className="flex-1"
        />
        <Button type="button" size="icon-sm" onClick={handleStartCreate} aria-label={createTitle}>
          <PlusIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {isLoading ? (
          <LoadingState label="Carregando insumos..." />
        ) : total === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🌾</EmptyState.Icon>
            <EmptyState.Title>Nenhum insumo ainda</EmptyState.Title>
            <EmptyState.Description>
              Cadastre os insumos que você compra para montar a ficha técnica dos seus produtos.
            </EmptyState.Description>
            <EmptyState.Action>
              <Button size="sm" onClick={handleStartCreate}>
                {createTitle}
              </Button>
            </EmptyState.Action>
          </EmptyState>
        ) : supplies.length === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🔍</EmptyState.Icon>
            <EmptyState.Title>Nenhum insumo encontrado</EmptyState.Title>
            <EmptyState.Description>Nenhum resultado para "{searchInput}"</EmptyState.Description>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Preço da compra</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Qtd. comprada</TableHead>
                  <TableHead className="text-right">Custo/unidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((supply) => (
                  <TableRow
                    key={supply.id}
                    className="cursor-pointer"
                    onClick={() => handleStartEdit(supply)}
                  >
                    <TableCell className="max-w-32 truncate font-heading font-medium sm:max-w-none">
                      {supply.name}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {currencyFormatter.format(supply.purchasePrice)}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {supply.purchaseQuantity} {supply.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {unitCostFormatter.format(supply.costPerUnit)} / {supply.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
