import { ApiError } from "@/src/lib/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoicesApi } from "./invoices.api";

const item = {
  id: "item-1",
  invoiceId: "invoice-1",
  productId: "product-1",
  productName: "Packing tape",
  unitPriceCents: 350,
  quantity: 2,
  lineTotalCents: 700,
};
const invoice = {
  id: "invoice-1",
  userId: "user-1",
  invoiceNumber: "INV-2026-0001",
  customerName: "Acme",
  issueDate: "2026-09-03T00:00:00.000Z",
  dueDate: null,
  status: "DRAFT",
  version: 1,
  notes: null,
  subtotalCents: 700,
  taxAmountCents: 77,
  totalCents: 777,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  items: [item],
} as const;

describe("invoicesApi", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());
  it("parses list and detail responses and includes encoded query parameters", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Invoices retrieved.",
            data: { items: [invoice], total: 1, page: 2, pageSize: 10 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "Invoice retrieved.", data: invoice }),
        ),
      );
    await expect(
      invoicesApi.list({ page: 2, pageSize: 10, status: "DRAFT" }),
    ).resolves.toMatchObject({ items: [invoice] });
    await expect(invoicesApi.get("invoice/a")).resolves.toMatchObject({
      id: "invoice-1",
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "http://localhost:3000/invoices?page=2&pageSize=10&status=DRAFT",
    );
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(
      "http://localhost:3000/invoices/invoice%2Fa",
    );
  });
  it("rejects malformed success responses and normalizes API errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { items: [], total: 0, page: 1, pageSize: 10 },
        }),
      ),
    );
    await expect(invoicesApi.list({ page: 1, pageSize: 10 })).rejects.toThrow(
      "unexpected response",
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: ["Only drafts can be edited."] }),
        { status: 409 },
      ),
    );
    await expect(invoicesApi.get("invoice-1")).rejects.toEqual(
      expect.objectContaining({
        constructor: ApiError,
        message: "Only drafts can be edited.",
      }),
    );
  });
});
