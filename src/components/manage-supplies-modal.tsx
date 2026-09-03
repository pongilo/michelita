import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SuppliesManager } from "@/components/supplies-manager";
import { Button } from "@/components/ui/button";

type ManageSuppliesModalProps = {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
};

export function ManageSuppliesModal({ isOpen, organizationId, onClose }: ManageSuppliesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Gerenciar insumos</DialogTitle>
        </DialogHeader>

        <SuppliesManager organizationId={organizationId} />

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
