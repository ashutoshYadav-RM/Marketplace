export type LocationHit = {
  locationId: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  locationName: string;
  locationSlug: string;
  city: string | null;
  locality: string | null;
  isVerified: boolean;
  distanceMeters: number;
};

export type ProductHit = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unit: string;
  organizationSlug: string;
  organizationName: string;
  locationId: string;
  locationSlug: string;
  locationName: string;
  amountMinor: number;
  currencyCode: string;
  stockQty: number;
  isAvailable: boolean;
  distanceMeters: number;
};

export type ServiceHit = {
  serviceId: string;
  serviceName: string;
  visitChargeMinor: number | null;
  currencyCode: string | null;
  organizationSlug: string;
  organizationName: string;
  locationSlug: string;
  locationName: string;
  distanceMeters: number;
};

export type OfferHit = {
  offerId: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  currencyCode: string | null;
  organizationName: string;
  organizationSlug: string;
  locationSlug: string;
  distanceMeters: number;
};

export type GeoPoint = { latitude: number; longitude: number };
