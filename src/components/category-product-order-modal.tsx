import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Reorder, useDragControls } from "motion/react";
import { GripVerticalIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReorderProducts } from "@/hooks/tanstack/product/use-reorder-products";
import { useUpdateProductCategory } from "@/hooks/tanstack/product-category/use-update-product-category";

const DEFAULT_DISPLAY_LIMIT = 3;

type Product = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  displayLimit: number | null;
};

type Row = { kind: "product"; product: Product } | { kind: "limit" };

type CategoryProductOrderModalProps = {
  isOpen: boolean;
  categoryName: string;
  category: Category | null;
  products: Product[];
  organizationId: string;
  onClose: () => void;
};

function DraggableProductRow({ row }: { row: Extract<Row, { kind: "product" }> }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
    >
      <button
        type="button"
        className="flex-none cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label="Arrastar para reordenar"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex-1 truncate">{row.product.name}</span>
    </Reorder.Item>
  );
}

function DraggableLimitRow({ row }: { row: Extract<Row, { kind: "limit" }> }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 rounded-xl border border-dashed border-michelita-purple bg-michelita-purple/5 px-3 py-2 text-xs font-medium text-michelita-purple"
    >
      <button
        type="button"
        className="flex-none cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label="Arrastar limite de exibição"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex-1">Abaixo, os produtos ficam no "ver mais" do cardápio</span>
    </Reorder.Item>
  );
}

function buildInitialRows(products: Product[], displayLimit: number | null | undefined): Row[] {
  const rows: Row[] = products.map((product) => ({ kind: "product", product }));
  if (displayLimit != null) {
    const insertAt = Math.min(displayLimit, rows.length);
    rows.splice(insertAt, 0, { kind: "limit" });
  }
  return rows;
}

export function CategoryProductOrderModal({
  isOpen,
  categoryName,
  category,
  products,
  organizationId,
  onClose,
}: CategoryProductOrderModalProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: reorderProducts } = useReorderProducts({ organizationId });
  const { mutateAsync: updateCategory } = useUpdateProductCategory({ organizationId });

  useEffect(() => {
    if (!isOpen) return;
    setRows(buildInitialRows(products, category?.displayLimit));
  }, [isOpen, products, category]);

  const productCount = rows.filter((row) => row.kind === "product").length;
  const hasLimit = rows.some((row) => row.kind === "limit");

  function handleAddLimit() {
    setRows((prev) => {
      const insertAt = Math.min(DEFAULT_DISPLAY_LIMIT, prev.length);
      return [...prev.slice(0, insertAt), { kind: "limit" }, ...prev.slice(insertAt)];
    });
  }

  function handleRemoveLimit() {
    setRows((prev) => prev.filter((row) => row.kind !== "limit"));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const orderedIds = rows.filter((row) => row.kind === "product").map((row) => row.product.id);
      const limitIndex = rows.findIndex((row) => row.kind === "limit");
      const displayLimit = limitIndex === -1 ? undefined : Math.max(1, limitIndex);

      await Promise.all([
        reorderProducts({ organizationId, orderedIds }),
        category
          ? updateCategory({
              id: category.id,
              name: category.name,
              description: category.description ?? undefined,
              displayLimit,
            })
          : Promise.resolve(),
      ]);

      toast.success("Ordem dos produtos salva.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar a ordenação.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Organizar produtos{categoryName ? ` — ${categoryName}` : ""}</DialogTitle>
        </DialogHeader>

        {category && (
          <div className="flex items-center justify-between gap-2 px-5 pb-3">
            <p className="text-xs text-muted-foreground">Limite de produtos no cardápio</p>
            {hasLimit ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLimit}>
                Remover limite
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLimit}
                disabled={productCount === 0}
              >
                Adicionar limite
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
          ) : (
            <Reorder.Group
              as="ul"
              axis="y"
              values={rows}
              onReorder={setRows}
              className="flex flex-col gap-2 pb-3"
            >
              {rows.map((row) =>
                row.kind === "product" ? (
                  <DraggableProductRow key={row.product.id} row={row} />
                ) : (
                  <DraggableLimitRow key="limit-row" row={row} />
                ),
              )}
            </Reorder.Group>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || productCount < 2}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
