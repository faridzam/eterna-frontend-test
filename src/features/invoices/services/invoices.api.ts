import { apiRequest } from "@/src/lib/api-client";
import { z } from "zod";

const invoiceStatusSchema = z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]);
const invoiceItemSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().nonnegative(),
}).strict();
const invoiceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  customerName: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().nullable(),
  status: invoiceStatusSchema,
  notes: z.string().nullable(),
  subtotalCents: z.number().int().nonnegative(),
  taxAmountCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1),
}).strict();
const invoiceEnvelope = z.object({ message: z.string().min(1), data: invoiceSchema }).strict();
const invoicePageEnvelope = z.object({
  message: z.string().min(1),
  data: z.object({
    items: z.array(invoiceSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
  }).strict(),
}).strict();

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoicePage = z.infer<typeof invoicePageEnvelope>["data"];
export interface InvoiceItemInput { readonly productId: string; readonly quantity: number; }
export interface InvoiceInput {
  readonly customerName: string;
  readonly issueDate: string;
  readonly dueDate?: string;
  readonly notes?: string;
  readonly items: readonly InvoiceItemInput[];
}

export const invoicesApi = {
  async list(query: Readonly<{ page: number; pageSize: number; status?: InvoiceStatus; signal?: AbortSignal }>): Promise<InvoicePage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
    if (query.status !== undefined) params.set("status", query.status);
    return (await apiRequest(`/invoices?${params.toString()}`, { method: "GET", signal: query.signal }, invoicePageEnvelope)).data;
  },
  async get(id: string, signal?: AbortSignal): Promise<Invoice> {
    return (await apiRequest(`/invoices/${encodeURIComponent(id)}`, { method: "GET", signal }, invoiceEnvelope)).data;
  },
  async create(payload: InvoiceInput): Promise<{ readonly message: string; readonly invoice: Invoice }> {
    const response = await apiRequest("/invoices", { method: "POST", body: JSON.stringify(payload) }, invoiceEnvelope);
    return { message: response.message, invoice: response.data };
  },
  async updateDraft(id: string, payload: InvoiceInput): Promise<{ readonly message: string; readonly invoice: Invoice }> {
    const response = await apiRequest(`/invoices/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }, invoiceEnvelope);
    return { message: response.message, invoice: response.data };
  },
  async changeStatus(id: string, status: Exclude<InvoiceStatus, "DRAFT">): Promise<{ readonly message: string; readonly invoice: Invoice }> {
    const response = await apiRequest(`/invoices/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, invoiceEnvelope);
    return { message: response.message, invoice: response.data };
  },
};