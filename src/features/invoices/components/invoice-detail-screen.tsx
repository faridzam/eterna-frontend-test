"use client";

import { ApiError } from "@/src/lib/api-client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
    invoicesApi,
    type Invoice,
    type InvoiceStatus,
} from "../services/invoices.api";

const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const money = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const messageFrom = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "The request could not be completed. Please try again.";

export function InvoiceDetailScreen({ id }: Readonly<{ id: string }>) {
  const parsedId = idSchema.safeParse(id);
  const validId = parsedId.success ? parsedId.data : null;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(
    validId === null ? "This invoice ID is invalid." : null,
  );
  const [loading, setLoading] = useState(validId !== null);
  const [pending, setPending] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (validId === null) return;
      setLoading(true);
      setError(null);
      try {
        setInvoice(await invoicesApi.get(validId, signal));
      } catch (requestError: unknown) {
        if (signal?.aborted !== true) setError(messageFrom(requestError));
      } finally {
        if (signal?.aborted !== true) setLoading(false);
      }
    },
    [validId],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function changeStatus(
    status: Exclude<InvoiceStatus, "DRAFT">,
  ): Promise<void> {
    if (invoice === null || pending) return;
    setPending(true);
    setError(null);
    try {
      setInvoice(
        (
          await invoicesApi.changeStatus(invoice.id, status, invoice.version)
        ).invoice,
      );
    } catch (requestError: unknown) {
      setError(messageFrom(requestError));
    } finally {
      setPending(false);
    }
  }
  if (loading)
    return (
      <main className="dashboard">
        <p className="list-status" aria-live="polite">
          Loading invoice...
        </p>
      </main>
    );
  if (error !== null || invoice === null)
    return (
      <main className="dashboard">
        <div className="inline-error">
          <p role="alert">{error ?? "Invoice not found."}</p>
          <button
            className="secondary-button"
            onClick={() => void load()}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  return (
    <main className="dashboard">
      <section
        className="invoice-detail-page"
        aria-labelledby="invoice-detail-title"
      >
        <p className="section-label">Invoice detail</p>
        <h1 id="invoice-detail-title">{invoice.invoiceNumber}</h1>
        <p>
          <strong>Customer</strong> {invoice.customerName}
        </p>
        <p>
          <strong>Status</strong> {invoice.status}
        </p>
        <div className="invoice-detail-lines">
          {invoice.items.map((item) => (
            <div className="invoice-detail-line" key={item.id}>
              <span>
                {item.productName} x {item.quantity}
              </span>
              <strong>{money(item.lineTotalCents)}</strong>
            </div>
          ))}
        </div>
        <dl className="invoice-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(invoice.subtotalCents)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{money(invoice.taxAmountCents)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(invoice.totalCents)}</dd>
          </div>
        </dl>
        <div className="form-actions">
          {invoice.status === "DRAFT" ? (
            <>
              <button
                className="secondary-button"
                disabled={pending}
                onClick={() => void changeStatus("ISSUED")}
                type="button"
              >
                Issue invoice
              </button>
              <button
                className="danger-button"
                disabled={pending}
                onClick={() => void changeStatus("CANCELLED")}
                type="button"
              >
                Cancel invoice
              </button>
            </>
          ) : invoice.status === "ISSUED" ? (
            <>
              <button
                className="secondary-button"
                disabled={pending}
                onClick={() => void changeStatus("PAID")}
                type="button"
              >
                Mark paid
              </button>
              <button
                className="danger-button"
                disabled={pending}
                onClick={() => void changeStatus("CANCELLED")}
                type="button"
              >
                Cancel invoice
              </button>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
