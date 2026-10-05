export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unit: string;
  amountMinor: number;
  currencyCode: string;
  quantity: number;
  /** Stock known at add-to-cart time — a client-side guardrail only. The
   * authoritative check happens again in `place_order()` at checkout. */
  maxQuantity: number;
};

export type CartShop = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
};

export type Cart = CartShop & { items: CartItem[] };
