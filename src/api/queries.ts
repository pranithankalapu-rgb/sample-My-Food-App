// TanStack Query hooks: caching, loading and error state for every read.
// Retries for safe GETs happen in the HTTP client, so Query does not retry.
import { QueryClient, keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./index";
import { probe, type ProbeResult } from "./probes";
import type { SearchRequest } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export const keys = {
  product: (code: string) => ["product", code] as const,
  search: (req: SearchRequest) => ["search", req] as const,
  list: (page: number, limit: number) => ["product-list", page, limit] as const,
  byCategory: (categories: string[]) => ["by-category", categories] as const,
  byAdditives: (tags: string[]) => ["by-additives", tags] as const,
  user: (id: string) => ["user", id] as const,
  history: (id: string) => ["history", id] as const,
  reviewQueue: (page: number) => ["review-queue", page] as const,
  imageQueue: (page: number) => ["image-queue", page] as const,
  users: (page: number) => ["users", page] as const,
  identifiers: ["identifiers"] as const,
  status: (name: string) => ["status", name] as const,
};

/** A lookup counts as a scan on the server, so it is cached for 10 minutes. */
export function useProduct(code: string, enabled = true) {
  return useQuery({
    queryKey: keys.product(code),
    queryFn: ({ signal }) => api.product.lookup(code, { signal }),
    enabled: enabled && code !== "",
    staleTime: 10 * 60_000,
  });
}

export function useSearch(req: SearchRequest, enabled = true) {
  return useQuery({
    queryKey: keys.search(req),
    queryFn: ({ signal }) => api.product.search(req, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProductList(page: number, limit: number, enabled = true) {
  return useQuery({
    queryKey: keys.list(page, limit),
    queryFn: ({ signal }) => api.product.list({ page, limit }, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useByCategory(categories: string[]) {
  return useQuery({
    queryKey: keys.byCategory(categories),
    queryFn: ({ signal }) => api.product.byCategory({ category: categories }, { signal }),
    enabled: categories.length > 0,
  });
}

export function useByAdditives(tags: string[]) {
  return useQuery({
    queryKey: keys.byAdditives(tags),
    queryFn: ({ signal }) => api.product.byAdditives({ additives_tags: tags }, { signal }),
    enabled: tags.length > 0,
  });
}

export function useUserDetails(id: string | undefined) {
  return useQuery({
    queryKey: keys.user(id ?? ""),
    queryFn: ({ signal }) => api.user.get(id ?? "", { signal }),
    enabled: Boolean(id),
  });
}

export function useHistory(id: string | undefined) {
  return useQuery({
    queryKey: keys.history(id ?? ""),
    queryFn: ({ signal }) => api.user.history(id ?? "", { signal }),
    enabled: Boolean(id),
  });
}

export function useReviewQueue(page: number) {
  return useQuery({
    queryKey: keys.reviewQueue(page),
    queryFn: ({ signal }) => api.admin.reviewQueue({ page, limit: 20 }, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useImageQueue(page: number) {
  return useQuery({
    queryKey: keys.imageQueue(page),
    queryFn: ({ signal }) => api.admin.imageQueue({ page, limit: 20 }, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUsers(page: number) {
  return useQuery({
    queryKey: keys.users(page),
    queryFn: ({ signal }) => api.admin.users({ page, limit: 20 }, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useIdentifiers() {
  return useQuery({
    queryKey: keys.identifiers,
    queryFn: ({ signal }) => api.billing.identifiers({ signal }),
    staleTime: 5 * 60_000,
  });
}

export function useProbe(name: string, run: () => Promise<ProbeResult>) {
  return useQuery({
    queryKey: keys.status(name),
    queryFn: run,
    refetchInterval: 15_000,
    staleTime: 0,
  });
}

export { probe };
