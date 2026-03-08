import { supabase } from "@/lib/supabase";
import type { SaveOrderInput } from "./types";

export type PreparedOrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  note: string | null;
  deliveryType: SaveOrderInput["items"][number]["deliveryType"];
  customizations: {
    name: string;
    value: string;
  }[];
};

export type PreparedOrderPayment = {
  method: SaveOrderInput["payments"][number]["method"];
  amount: number;
  status: SaveOrderInput["payments"][number]["status"];
  paidAt: string | null;
  note: string | null;
};

export type PreparedOrderData = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryDatetime: string | null;
  deliveryAddress: string | null;
  items: PreparedOrderItem[];
  payments: PreparedOrderPayment[];
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function prepareOrderData(input: SaveOrderInput): Promise<PreparedOrderData> {
  if (input.items.length === 0) {
    throw new Error("Adicione pelo menos um item no pedido.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customer")
    .select("id")
    .eq("id", input.customerId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (customerError) {
    throw new Error(customerError.message);
  }

  if (!customer) {
    throw new Error("Cliente invalido para a organizacao atual.");
  }

  const uniqueProductIds = Array.from(new Set(input.items.map((item) => item.productId)));

  const { data: products, error: productsError } = await supabase
    .from("product")
    .select("id, name, price")
    .eq("organization_id", input.organizationId)
    .in("id", uniqueProductIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const productsMap = new Map(products.map((product) => [product.id, product]));

  const preparedItems = input.items.map<PreparedOrderItem>((item) => {
    const product = productsMap.get(item.productId);

    if (!product) {
      throw new Error("Um ou mais produtos informados sao invalidos para esta organizacao.");
    }

    const quantity = Math.max(1, Math.trunc(item.quantity));
    const unitPrice = roundCurrency(Number(product.price));
    const lineTotal = roundCurrency(unitPrice * quantity);
    const customizations = (item.customizations ?? [])
      .map((customization) => ({
        name: customization.name.trim(),
        value: customization.value.trim(),
      }))
      .filter((customization) => customization.name && customization.value);

    return {
      productId: item.productId,
      productName: product.name,
      unitPrice,
      quantity,
      total: lineTotal,
      note: item.note?.trim() ? item.note.trim() : null,
      deliveryType: item.deliveryType,
      customizations,
    };
  });

  const subtotal = roundCurrency(preparedItems.reduce((sum, item) => sum + item.total, 0));
  const deliveryFee = roundCurrency(Math.max(0, input.deliveryFee));
  const total = roundCurrency(subtotal + deliveryFee);

  const preparedPayments = input.payments.map<PreparedOrderPayment>((payment) => ({
    method: payment.method,
    amount: roundCurrency(Math.max(0, payment.amount)),
    status: payment.status,
    paidAt: payment.paidAt ?? null,
    note: payment.note?.trim() ? payment.note.trim() : null,
  }));

  return {
    subtotal,
    deliveryFee,
    total,
    deliveryDatetime: input.deliveryDatetime ?? null,
    deliveryAddress: input.deliveryAddress?.trim() ? input.deliveryAddress.trim() : null,
    items: preparedItems,
    payments: preparedPayments,
  };
}
