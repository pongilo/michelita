import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EditIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupplyFormModal, type SupplyFormValues } from "@/components/supply-form-modal";
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
};

type ManageSuppliesModalProps = {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
};

export function ManageSuppliesModal({ isOpen, organizationId, onClose }: ManageSuppliesModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

  const { data, isLoading } = useGetSupplies({ organizationId });
  const allSupplies = useMemo(() => data?.supplies ?? [], [data]);
  const total = allSupplies.length;

  const supplies = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return allSupplies;
    return allSupplies.filter((supply) => normalize(supply.name).includes(search));
  }, [allSupplies, searchInput]);

  const { mutateAsync: createSupply, isPending: isCreating } = useCreateSupply();
  const { mutateAsync: updateSupply, isPending: isUpdating } = useUpdateSupply({ organizationId });
  const { mutateAsync: deleteSupply, isPending: isDeleting } = useDeleteSupply({ organizationId });
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
        await createSupply({ organizationId, ...values });
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
      await deleteSupply({ id: supply.id, organizationId });
      toast.success("Insumo excluído com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir insumo.");
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>Gerenciar insumos</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 px-5 pb-3">
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar insumo"
              className="flex-1"
            />
            <Button type="button" size="icon-sm" onClick={handleStartCreate} aria-label="Novo insumo">
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
                    Novo insumo
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
                      <TableHead className="w-0" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplies.map((supply) => (
                      <TableRow key={supply.id}>
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
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(supply)}
                              disabled={isDeleting}
                            >
                              <EditIcon />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleDelete(supply)}
                              disabled={isDeleting}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
