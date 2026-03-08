import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import type { OrderItemWithCustomizations, OrderWithDetails } from "./types";

type GetOrdersProps = {
  organizationId: string;
};

export async function getOrders({ organizationId }: GetOrdersProps): Promise<OrderWithDetails[]> {
  const { data: orders, error: ordersError } = await supabase
    .from("order")
    .select("*")
    .eq("organization_id", organizationId)
    .order("delivery_datetime", { ascending: false, nullsFirst: false });

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const customerIds = Array.from(new Set(orders.map((order) => order.customer_id)));

  const [customersResult, itemsResult, paymentsResult] = await Promise.all([
    supabase.from("customer").select("id, name").in("id", customerIds),
    supabase.from("order_item").select("*").in("order_id", orderIds),
    supabase.from("order_payments").select("*").in("order_id", orderIds).order("created_at", { ascending: true }),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  const items = itemsResult.data ?? [];
  const itemIds = items.map((item) => item.id);

  let customizations: Database["public"]["Tables"]["order_item_customization"]["Row"][] = [];

  if (itemIds.length > 0) {
    const customizationsResult = await supabase
      .from("order_item_customization")
      .select("*")
      .in("order_item_id", itemIds);

    if (customizationsResult.error) {
      throw new Error(customizationsResult.error.message);
    }

    customizations = customizationsResult.data ?? [];
  }

  const customerNameById = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.name]));
  const customizationsByOrderItemId = new Map<string, Database["public"]["Tables"]["order_item_customization"]["Row"][]>();

  customizations.forEach((customization) => {
    const current = customizationsByOrderItemId.get(customization.order_item_id) ?? [];
    current.push(customization);
    customizationsByOrderItemId.set(customization.order_item_id, current);
  });

  const itemsByOrderId = new Map<string, OrderItemWithCustomizations[]>();

  items.forEach((item) => {
    const current = itemsByOrderId.get(item.order_id) ?? [];
    current.push({
      ...item,
      customizations: customizationsByOrderItemId.get(item.id) ?? [],
    });
    itemsByOrderId.set(item.order_id, current);
  });

  const paymentsByOrderId = new Map<
    string,
    Database["public"]["Tables"]["order_payments"]["Row"][]
  >();

  (paymentsResult.data ?? []).forEach((payment) => {
    const current = paymentsByOrderId.get(payment.order_id) ?? [];
    current.push(payment);
    paymentsByOrderId.set(payment.order_id, current);
  });

  return orders.map((order) => ({
    ...order,
    customer_name: customerNameById.get(order.customer_id) ?? null,
    items: itemsByOrderId.get(order.id) ?? [],
    payments: paymentsByOrderId.get(order.id) ?? [],
  }));
}
