import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipesManager } from "@/components/recipes-manager";
import { Button } from "@/components/ui/button";

type ManageRecipesModalProps = {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
};

export function ManageRecipesModal({ isOpen, organizationId, onClose }: ManageRecipesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Gerenciar receitas</DialogTitle>
        </DialogHeader>

        <RecipesManager organizationId={organizationId} />

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
