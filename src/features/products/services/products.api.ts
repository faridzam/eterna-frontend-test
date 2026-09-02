import { apiRequest } from "@/src/lib/api-client";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().min(1), userId: z.string().min(1), sku: z.string().min(1), name: z.string().min(1),
  description: z.string().nullable(), unitPriceCents: z.number().int().nonnegative(), quantityOnHand: z.number().int().nonnegative(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), deletedAt: z.string().datetime().nullable(),
});
const pageEnvelope = z.object({ message: z.string().min(1), data: z.object({ items: z.array(productSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive().max(100) }) });
const productEnvelope = z.object({ message: z.string().min(1), data: productSchema });
const deleteEnvelope = z.object({ message: z.string().min(1), data: z.null() });
export type Product = z.infer<typeof productSchema>;
export type ProductPage = z.infer<typeof pageEnvelope>["data"];
export interface ProductInput { readonly sku: string; readonly name: string; readonly description?: string; readonly unitPriceCents: number; readonly quantityOnHand: number; }

export const productsApi = {
  async list(query: Readonly<{ page: number; pageSize: number; search?: string; signal?: AbortSignal }>): Promise<ProductPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
    if (query.search) params.set("search", query.search);
    return (await apiRequest(`/products?${params.toString()}`, { method: "GET", signal: query.signal }, pageEnvelope)).data;
  },
  async create(payload: ProductInput): Promise<Product> { return (await apiRequest("/products", { method: "POST", body: JSON.stringify(payload) }, productEnvelope)).data; },
  async update(id: string, payload: ProductInput): Promise<Product> { return (await apiRequest(`/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }, productEnvelope)).data; },
  async remove(id: string): Promise<void> { await apiRequest(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }, deleteEnvelope); },
};
