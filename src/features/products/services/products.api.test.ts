import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productsApi } from "./products.api";

const product = { id: "product-1", userId: "user-1", sku: "SF-100", name: "Packing tape", description: null, unitPriceCents: 350, quantityOnHand: 4, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null };

describe("productsApi", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());
  it("parses a product page and builds search parameters", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: "Products retrieved successfully.", data: { items: [product], total: 1, page: 1, pageSize: 10 } }), { status: 200 }));
    await expect(productsApi.list({ page: 1, pageSize: 10, search: "SF-100" })).resolves.toMatchObject({ items: [product] });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("http://localhost:3000/products?page=1&pageSize=10&search=SF-100");
  });
  it("rejects malformed success responses", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { items: [], total: 0, page: 1, pageSize: 10 } }), { status: 200 }));
    await expect(productsApi.list({ page: 1, pageSize: 10 })).rejects.toThrow("unexpected response");
  });
});
