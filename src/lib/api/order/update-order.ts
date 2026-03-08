import { supabase } from "@/lib/supabase";
import { prepareOrderData } from "./prepare-order-data";
import type { SaveOrderInput } from "./types";

type UpdateOrderProps = SaveOrderInput & {
  id: string;
};

export async function updateOrder({ id, ...input }: UpdateOrderProps) {
  const preparedOrderData = await prepareOrderData(input);

  const { error: orderError } = await supabase
    .from("order")
    .update({
      customer_id: input.customerId,
      organization_id: input.organizationId,
      type: input.type,
      status: input.status,
      subtotal: preparedOrderData.subtotal,
      delivery_fee: preparedOrderData.deliveryFee,
      total: preparedOrderData.total,
      delivery_datetime: preparedOrderData.deliveryDatetime,
      delivery_address: preparedOrderData.deliveryAddress,
    })
    .eq("id", id);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { error: deletePaymentsError } = await supabase.from("order_payments").delete().eq("order_id", id);
  if (deletePaymentsError) {
    throw new Error(deletePaymentsError.message);
  }

  const { error: deleteItemsError } = await supabase.from("order_item").delete().eq("order_id", id);
  if (deleteItemsError) {
    throw new Error(deleteItemsError.message);
  }

  for (const item of preparedOrderData.items) {
    const { data: createdItem, error: itemError } = await supabase
      .from("order_item")
      .insert({
        order_id: id,
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        total: item.total,
        note: item.note,
        delivery_type: item.deliveryType,
      })
      .select("id")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (item.customizations.length > 0) {
      const { error: customizationsError } = await supabase.from("order_item_customization").insert(
        item.customizations.map((customization) => ({
          order_item_id: createdItem.id,
          name: customization.name,
          value: customization.value,
        }))
      );

      if (customizationsError) {
        throw new Error(customizationsError.message);
      }
    }
  }

  if (preparedOrderData.payments.length > 0) {
    const { error: paymentsError } = await supabase.from("order_payments").insert(
      preparedOrderData.payments.map((payment) => ({
        order_id: id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        paid_at: payment.paidAt,
        note: payment.note,
      }))
    );

    if (paymentsError) {
      throw new Error(paymentsError.message);
    }
  }
}
