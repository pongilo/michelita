import React from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import { ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ProductListContent, ProductListModal } from "@/components/product-list-modal";
import { CustomerListContent, CustomerListModal } from "@/components/customer-list-modal";
import { OrderNoteContent, OrderNoteModal } from "@/components/order-note-modal";
import { OrderDeliveryContent, OrderDeliveryModal } from "@/components/order-delivery-modal";
import { OrderEditItemContent, OrderEditItemModal } from "@/components/order-edit-item-modal";
import { OrderScheduleItemContent, OrderScheduleItemModal } from "@/components/order-schedule-item-modal";
import { OrderItemNoteContent, OrderItemNoteModal } from "@/components/order-item-note-modal";

type OrderFormPanelsProps = {
  organizationId: string;
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
};

function MobilePanel({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <main className="flex flex-col">
      <div className="flex-none flex items-center gap-1 sticky top-0 bg-white z-20 p-3 border-b">
        <Button type="button" variant="ghost" size="icon-lg" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <h2 className="text-xl font-heading">{title}</h2>
      </div>
      <div className="flex-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}

export function OrderFormPanels({ organizationId, deliveryDate, setDeliveryDate }: OrderFormPanelsProps) {
  const isMobile = useIsMobile();
  const [modal, setModal] = useQueryState("modal");
  const [, setItemIndex] = useQueryState("itemIndex", parseAsInteger);
  const [, setCustomerSearch] = useQueryState("q");

  const onCloseModal = () => setModal(null);
  const onCloseCustomerModal = () => { setModal(null); setCustomerSearch(""); };
  const onCloseItemModal = () => { setModal(null); setItemIndex(null); };

  if (isMobile && modal) {
    switch (modal) {
      case "product":
        return (
          <MobilePanel title="Adicionar item" onBack={onCloseModal}>
            <ProductListContent organizationId={organizationId} deliveryDate={deliveryDate} onClose={onCloseModal} />
          </MobilePanel>
        );
      case "customer":
        return (
          <MobilePanel title="Selecionar cliente" onBack={onCloseCustomerModal}>
            <CustomerListContent organizationId={organizationId} onClose={onCloseCustomerModal} />
          </MobilePanel>
        );
      case "note":
        return (
          <MobilePanel title="Observação do pedido" onBack={onCloseModal}>
            <OrderNoteContent onClose={onCloseModal} />
          </MobilePanel>
        );
      case "delivery":
        return (
          <MobilePanel title="Entrega do pedido" onBack={onCloseModal}>
            <OrderDeliveryContent deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} onClose={onCloseModal} />
          </MobilePanel>
        );
      case "editItem":
        return (
          <MobilePanel title="Editar item" onBack={onCloseItemModal}>
            <OrderEditItemContent onClose={onCloseItemModal} />
          </MobilePanel>
        );
      case "scheduleItem":
        return (
          <MobilePanel title="Agendar entrega do item" onBack={onCloseItemModal}>
            <OrderScheduleItemContent deliveryDate={deliveryDate} onClose={onCloseItemModal} />
          </MobilePanel>
        );
      case "itemNote":
        return (
          <MobilePanel title="Observação do item" onBack={onCloseItemModal}>
            <OrderItemNoteContent onClose={onCloseItemModal} />
          </MobilePanel>
        );
      default:
        return null;
    }
  }

  if (!isMobile) {
    return (
      <>
        <CustomerListModal organizationId={organizationId} />
        <ProductListModal organizationId={organizationId} deliveryDate={deliveryDate} />
        <OrderScheduleItemModal deliveryDate={deliveryDate} />
        <OrderEditItemModal />
        <OrderDeliveryModal deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} />
        <OrderNoteModal />
        <OrderItemNoteModal />
      </>
    );
  }

  return null;
}
