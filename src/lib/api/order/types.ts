import type { Database } from "@/lib/database.types";

export type OrderType = Database["public"]["Tables"]["order"]["Row"]["type"];
export type OrderStatus = Database["public"]["Tables"]["order"]["Row"]["status"];
export type DeliveryType = Database["public"]["Tables"]["order_item"]["Row"]["delivery_type"];
export type PaymentMethod = Database["public"]["Tables"]["order_payments"]["Row"]["method"];
export type PaymentStatus = Database["public"]["Tables"]["order_payments"]["Row"]["status"];

export type OrderItemCustomizationInput = {
  name: string;
  value: string;
};

export type OrderItemInput = {
  productId: string;
  quantity: number;
  note?: string;
  deliveryType: DeliveryType;
  customizations?: OrderItemCustomizationInput[];
};

export type OrderPaymentInput = {
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | null;
  note?: string;
};

export type SaveOrderInput = {
  organizationId: string;
  customerId: string;
  type: OrderType;
  status: OrderStatus;
  deliveryFee: number;
  deliveryDatetime?: string | null;
  deliveryAddress?: string;
  items: OrderItemInput[];
  payments: OrderPaymentInput[];
};

export type OrderItemWithCustomizations = Database["public"]["Tables"]["order_item"]["Row"] & {
  customizations: Database["public"]["Tables"]["order_item_customization"]["Row"][];
};

export type OrderWithDetails = Database["public"]["Tables"]["order"]["Row"] & {
  customer_name: string | null;
  items: OrderItemWithCustomizations[];
  payments: Database["public"]["Tables"]["order_payments"]["Row"][];
};
