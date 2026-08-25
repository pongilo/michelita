import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Reorder, useDragControls } from "motion/react";
import { GripVerticalIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReorderProductCategories } from "@/hooks/tanstack/product-category/use-reorder-product-categories";

type Category = {
  id: string;
  name: string;
};

type CategoryOrderModalProps = {
  isOpen: boolean;
  categories: Category[];
  organizationId: string;
  onClose: () => void;
};

function DraggableCategoryRow({ category }: { category: Category }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={category}
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
      <span className="flex-1 truncate">{category.name}</span>
    </Reorder.Item>
  );
}

export function CategoryOrderModal({ isOpen, categories, organizationId, onClose }: CategoryOrderModalProps) {
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: reorderCategories } = useReorderProductCategories({ organizationId });

  useEffect(() => {
    if (!isOpen) return;
    setOrderedCategories(categories);
  }, [isOpen, categories]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await reorderCategories({
        organizationId,
        orderedIds: orderedCategories.map((category) => category.id),
      });
      toast.success("Ordem das categorias salva.");
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
          <DialogTitle>Organizar categorias</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5">
          {orderedCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : (
            <Reorder.Group
              as="ul"
              axis="y"
              values={orderedCategories}
              onReorder={setOrderedCategories}
              className="flex flex-col gap-2 pb-3"
            >
              {orderedCategories.map((category) => (
                <DraggableCategoryRow key={category.id} category={category} />
              ))}
            </Reorder.Group>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || orderedCategories.length < 2}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
