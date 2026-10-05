import "server-only";
import type { GeoPoint, LocationHit, OfferHit, ProductHit, ServiceHit } from "../domain/types";

/**
 * The whole point of this interface: everything in `modules/search/service`
 * and every page that renders search results talks to `SearchProvider`, not
 * to Postgres. Moving to OpenSearch/Meilisearch/Algolia later is writing a
 * new file that implements this interface and swapping the export at the
 * bottom — no caller changes (blueprint §01, §09).
 */
export interface SearchProvider {
  nearbyLocations(params: {
    origin: GeoPoint;
    radiusMeters?: number;
    categoryId?: string;
    limit?: number;
  }): Promise<LocationHit[]>;

  nearbyProducts(params: {
    origin: GeoPoint;
    radiusMeters?: number;
    query?: string;
    categoryId?: string;
    limit?: number;
  }): Promise<ProductHit[]>;

  nearbyServices(params: {
    origin: GeoPoint;
    radiusMeters?: number;
    query?: string;
    categoryId?: string;
    limit?: number;
  }): Promise<ServiceHit[]>;

  nearbyOffers(params: { origin: GeoPoint; radiusMeters?: number; limit?: number }): Promise<OfferHit[]>;
}
