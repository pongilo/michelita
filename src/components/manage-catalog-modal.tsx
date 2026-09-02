import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SuppliesManager } from "@/components/supplies-manager";
import { RecipesManager } from "@/components/recipes-manager";

type CatalogTab = "supplies" | "recipes";

type ManageCatalogModalProps = {
  isOpen: boolean;
  organizationId: string;
  defaultTab?: CatalogTab;
  onClose: () => void;
};

export function ManageCatalogModal({
  isOpen,
  organizationId,
  defaultTab = "supplies",
  onClose,
}: ManageCatalogModalProps) {
  const [tab, setTab] = useState<CatalogTab>(defaultTab);

  useEffect(() => {
    if (isOpen) setTab(defaultTab);
  }, [isOpen, defaultTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Gerenciar ficha técnica</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => value && setTab(value as CatalogTab)}
          className="min-h-0 flex-1 gap-3"
        >
          <TabsList className="mx-5 w-fit">
            <TabsTrigger value="supplies">Insumos</TabsTrigger>
            <TabsTrigger value="recipes">Receitas</TabsTrigger>
          </TabsList>

          <TabsContent value="supplies" className="flex min-h-0 flex-1 flex-col">
            <SuppliesManager organizationId={organizationId} />
          </TabsContent>
          <TabsContent value="recipes" className="flex min-h-0 flex-1 flex-col">
            <RecipesManager organizationId={organizationId} />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
