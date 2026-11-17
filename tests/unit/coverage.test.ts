import { describe, expect, it } from "vitest";
import { endpointRegistry } from "../../src/api/endpoints";
import { inventory } from "../../src/data/inventory";

// The typed client must cover 100% of the inventory, with the same method and path.
describe("API client coverage", () => {
  it("has one registry entry per inventory endpoint and no extras", () => {
    const inventoryIds = inventory.endpoints.map((e) => e.id).sort();
    const clientIds = Object.keys(endpointRegistry).sort();
    expect(clientIds).toEqual(inventoryIds);
    expect(inventoryIds).toHaveLength(inventory.meta.registrationCount.total);
  });

  it.each(inventory.endpoints.map((e) => [e.id, e.method, e.path] as const))(
    "%s is %s %s",
    (id, method, path) => {
      const entry = endpointRegistry[id as keyof typeof endpointRegistry];
      expect(entry.method).toBe(method);
      expect(entry.path).toBe(path);
    },
  );

  it("documents a prefilled example for every endpoint with inputs", () => {
    for (const ep of inventory.endpoints) {
      if (ep.params.length)
        expect(Object.keys(ep.example.params ?? {}), ep.id).toEqual(ep.params.map((p) => p.name));
      if (ep.body.length && ep.contentType !== "multipart/form-data")
        expect(ep.example.body, ep.id).toBeDefined();
    }
  });
});
