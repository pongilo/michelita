import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Reorder, useDragControls } from "motion/react";
import { GripVerticalIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReorderProducts } from "@/hooks/tanstack/product/use-reorder-products";

type Product = {
  id: string;
  name: string;
};

type CategoryProductOrderModalProps = {
  isOpen: boolean;
  category: { id: string; name: string } | null;
  products: Product[];
  organizationId: string;
  onClose: () => void;
};

function DraggableProductRow({ product }: { product: Product }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={product}
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
      <span className="flex-1 truncate">{product.name}</span>
    </Reorder.Item>
  );
}

export function CategoryProductOrderModal({
  isOpen,
  category,
  products,
  organizationId,
  onClose,
}: CategoryProductOrderModalProps) {
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: reorderProducts } = useReorderProducts({ organizationId });

  useEffect(() => {
    if (!isOpen) return;
    setOrderedProducts(products);
  }, [isOpen, products]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await reorderProducts({
        organizationId,
        orderedIds: orderedProducts.map((product) => product.id),
      });
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
          <DialogTitle>Organizar produtos{category ? ` — ${category.name}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5">
          {orderedProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
          ) : (
            <Reorder.Group
              as="ul"
              axis="y"
              values={orderedProducts}
              onReorder={setOrderedProducts}
              className="flex flex-col gap-2 pb-3"
            >
              {orderedProducts.map((product) => (
                <DraggableProductRow key={product.id} product={product} />
              ))}
            </Reorder.Group>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || orderedProducts.length < 2}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
