import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LocationHit, OfferHit, ProductHit, ServiceHit } from "../domain/types";
import type { SearchProvider } from "./search-provider";

const DEFAULT_PRODUCT_RADIUS_M = 5000;
const DEFAULT_SERVICE_RADIUS_M = 8000;

/** Backed by the `search_*_nearby` PostGIS functions in 0004_search.sql. */
export const postgresSearchProvider: SearchProvider = {
  async nearbyLocations({ origin, radiusMeters = DEFAULT_PRODUCT_RADIUS_M, categoryId, limit = 30 }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("search_locations_nearby", {
      p_lat: origin.latitude,
      p_lng: origin.longitude,
      p_radius_meters: radiusMeters,
      p_category_id: categoryId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("nearbyLocations failed:", error.message);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any): LocationHit => ({
      locationId: row.location_id,
      organizationId: row.organization_id,
      organizationSlug: row.organization_slug,
      organizationName: row.organization_name,
      locationName: row.location_name,
      locationSlug: row.location_slug,
      city: row.city,
      locality: row.locality,
      isVerified: row.is_verified,
      distanceMeters: row.distance_meters,
    }));
  },

  async nearbyProducts({ origin, radiusMeters = DEFAULT_PRODUCT_RADIUS_M, query, categoryId, limit = 30 }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("search_products_nearby", {
      p_lat: origin.latitude,
      p_lng: origin.longitude,
      p_radius_meters: radiusMeters,
      p_query: query ?? null,
      p_category_id: categoryId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("nearbyProducts failed:", error.message);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any): ProductHit => ({
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantName: row.variant_name,
      unit: row.unit,
      organizationSlug: row.organization_slug,
      organizationName: row.organization_name,
      locationId: row.location_id,
      locationSlug: row.location_slug,
      locationName: row.location_name,
      amountMinor: row.amount_minor,
      currencyCode: row.currency_code,
      stockQty: row.stock_qty,
      isAvailable: row.is_available,
      distanceMeters: row.distance_meters,
    }));
  },

  async nearbyServices({ origin, radiusMeters = DEFAULT_SERVICE_RADIUS_M, query, categoryId, limit = 30 }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("search_services_nearby", {
      p_lat: origin.latitude,
      p_lng: origin.longitude,
      p_radius_meters: radiusMeters,
      p_query: query ?? null,
      p_category_id: categoryId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("nearbyServices failed:", error.message);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any): ServiceHit => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      visitChargeMinor: row.visit_charge_minor,
      currencyCode: row.currency_code,
      organizationSlug: row.organization_slug,
      organizationName: row.organization_name,
      locationSlug: row.location_slug,
      locationName: row.location_name,
      distanceMeters: row.distance_meters,
    }));
  },

  async nearbyOffers({ origin, radiusMeters = DEFAULT_PRODUCT_RADIUS_M, limit = 10 }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("search_offers_nearby", {
      p_lat: origin.latitude,
      p_lng: origin.longitude,
      p_radius_meters: radiusMeters,
      p_limit: limit,
    });
    if (error) {
      console.error("nearbyOffers failed:", error.message);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any): OfferHit => ({
      offerId: row.offer_id,
      code: row.code,
      type: row.type,
      value: row.value,
      currencyCode: row.currency_code,
      organizationName: row.organization_name,
      organizationSlug: row.organization_slug,
      locationSlug: row.location_slug,
      distanceMeters: row.distance_meters,
    }));
  },
};
