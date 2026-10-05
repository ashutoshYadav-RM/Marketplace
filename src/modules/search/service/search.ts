import "server-only";
import { postgresSearchProvider } from "../data/postgres-search-provider";
import type { SearchProvider } from "../data/search-provider";

// The one line that changes when this moves to a dedicated search engine
// (OpenSearch / Meilisearch / Algolia) — see blueprint §09.
const provider: SearchProvider = postgresSearchProvider;

export const searchNearbyLocations = provider.nearbyLocations;
export const searchNearbyProducts = provider.nearbyProducts;
export const searchNearbyServices = provider.nearbyServices;
export const searchNearbyOffers = provider.nearbyOffers;
