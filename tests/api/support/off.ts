import type { Api } from "../../../src/api/endpoints";
import { offCandidates } from "./env";

/** Every barcode an instance currently lists (admin token: lists are not counted). */
export async function listedCodes(api: Api): Promise<Set<string>> {
  const known = new Set<string>();
  const first = await api.product.list({ page: 1, limit: 100 });
  for (let p = 1; p <= first.data.pageInfo.pages; p += 1) {
    for (const row of (await api.product.list({ page: p, limit: 100 })).data.data) known.add(row.code);
  }
  return known;
}

/**
 * Real Open Food Facts barcodes the instance does not have yet, so a lookup
 * really goes to Open Food Facts. `skip` keeps different tests on different codes.
 */
export async function freshOffCodes(api: Api, count: number, skip = 0): Promise<string[]> {
  const known = await listedCodes(api);
  const fresh = offCandidates()
    .filter((c) => !known.has(c))
    .slice(skip, skip + count);
  if (fresh.length < count)
    throw new Error(`only ${fresh.length} fresh Open Food Facts barcodes, ${count} needed`);
  return fresh;
}
