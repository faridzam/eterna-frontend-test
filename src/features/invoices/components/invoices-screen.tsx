"use client";

import { ApiError } from "@/src/lib/api-client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  productsApi,
  type Product,
} from "../../products/services/products.api";
import {
  invoicesApi,
  type Invoice,
  type InvoiceInput,
  type InvoiceStatus,
} from "../services/invoices.api";

const pageSize = 10;
const statuses: readonly InvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "CANCELLED",
];
const invoiceFormSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name is required.")
      .max(200, "Customer name is too long."),
    issueDate: z.string().min(1, "Issue date is required."),
    dueDate: z.string(),
    notes: z.string().max(2000, "Notes are too long."),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Select a product."),
          quantity: z.coerce
            .number()
            .int("Quantity must be a whole number.")
            .positive("Quantity must be greater than zero."),
        }),
      )
      .min(1, "Add at least one product line."),
  })
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.productId);
    if (ids.some((id) => id === ""))
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Select a product.",
      });
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Each product can only be added once.",
      });
  });
type FormValues = {
  customerName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: { productId: string; quantity: string }[];
};
type FormErrors = Partial<
  Record<"customerName" | "issueDate" | "dueDate" | "notes" | "items", string>
> &
  Record<string, string | undefined>;
const messageFrom = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "The request could not be completed. Please try again.";
const money = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const dateDisplay = (value: string): string =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
const today = (): string => new Date().toISOString().slice(0, 10);

function errorsFrom(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (errors[path] === undefined) errors[path] = issue.message;
  }
  return errors;
}

function InvoiceForm({
  editing,
  products,
  onCancel,
  onSaved,
}: Readonly<{
  editing: Invoice | null;
  products: readonly Product[];
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
}>) {
  const [values, setValues] = useState<FormValues>(() =>
    editing === null
      ? {
          customerName: "",
          issueDate: today(),
          dueDate: "",
          notes: "",
          items: [{ productId: "", quantity: "1" }],
        }
      : {
          customerName: editing.customerName,
          issueDate: editing.issueDate.slice(0, 10),
          dueDate: editing.dueDate?.slice(0, 10) ?? "",
          notes: editing.notes ?? "",
          items: editing.items.map((item) => ({
            productId: item.productId,
            quantity: String(item.quantity),
          })),
        },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>("button, input, textarea, select"),
      ).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  function change(field: keyof Omit<FormValues, "items">, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }
  function changeItem(
    index: number,
    field: "productId" | "quantity",
    value: string,
  ): void {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}.${field}`]: undefined,
      items: undefined,
    }));
  }
  function addItem(): void {
    const available = products.find(
      (product) => !values.items.some((item) => item.productId === product.id),
    );
    if (available !== undefined)
      setValues((current) => ({
        ...current,
        items: [...current.items, { productId: available.id, quantity: "1" }],
      }));
  }
  function removeItem(index: number): void {
    setValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const parsed = invoiceFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsFrom(parsed.error));
      return;
    }
    const payload: InvoiceInput = {
      customerName: parsed.data.customerName,
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate || undefined,
      notes: parsed.data.notes || undefined,
      items: parsed.data.items,
    };
    setPending(true);
    setRequestError(null);
    try {
      const result =
        editing === null
          ? await invoicesApi.create(payload)
          : await invoicesApi.updateDraft(editing.id, payload);
      await onSaved(result.message);
    } catch (error: unknown) {
      setRequestError(messageFrom(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      aria-labelledby="invoice-form-title"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      ref={dialogRef}
      role="dialog"
    >
      <form
        className="invoice-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="product-form-heading">
          <div>
            <p className="section-label">
              {editing === null ? "New invoice" : "Draft invoice"}
            </p>
            <h2 id="invoice-form-title">
              {editing === null ? "Create invoice" : "Edit invoice"}
            </h2>
          </div>
          <button
            aria-label="Close invoice form"
            className="modal-close"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            &#215;
          </button>
        </div>
        <div className="product-form-grid">
          <div className="field field-wide">
            <label htmlFor="invoice-customer">Customer name</label>
            <input
              aria-describedby={
                errors.customerName === undefined
                  ? undefined
                  : "invoice-customer-error"
              }
              aria-invalid={
                errors.customerName === undefined ? undefined : true
              }
              id="invoice-customer"
              onChange={(event) => change("customerName", event.target.value)}
              value={values.customerName}
            />
            {errors.customerName === undefined ? null : (
              <p className="field-error" id="invoice-customer-error">
                {errors.customerName}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="invoice-issue-date">Issue date</label>
            <input
              id="invoice-issue-date"
              onChange={(event) => change("issueDate", event.target.value)}
              type="date"
              value={values.issueDate}
            />
            {errors.issueDate === undefined ? null : (
              <p className="field-error">{errors.issueDate}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="invoice-due-date">Due date (optional)</label>
            <input
              id="invoice-due-date"
              onChange={(event) => change("dueDate", event.target.value)}
              type="date"
              value={values.dueDate}
            />
          </div>
          <div className="field field-wide">
            <label htmlFor="invoice-notes">Notes (optional)</label>
            <textarea
              id="invoice-notes"
              onChange={(event) => change("notes", event.target.value)}
              value={values.notes}
            />
          </div>
        </div>
        <fieldset className="invoice-lines">
          <legend>Product lines</legend>
          {values.items.map((item, index) => {
            const product = products.find(
              (candidate) => candidate.id === item.productId,
            );
            const quantity = Number.parseInt(item.quantity, 10);
            const lineTotal =
              product !== undefined &&
              Number.isInteger(quantity) &&
              quantity > 0
                ? product.unitPriceCents * quantity
                : 0;
            return (
              <div className="invoice-line" key={`${index}-${item.productId}`}>
                <div className="field">
                  <label htmlFor={`invoice-product-${index}`}>
                    Product {index + 1}
                  </label>
                  <select
                    id={`invoice-product-${index}`}
                    onChange={(event) =>
                      changeItem(index, "productId", event.target.value)
                    }
                    value={item.productId}
                  >
                    <option value="">Select a product</option>
                    {products
                      .filter(
                        (candidate) =>
                          candidate.id === item.productId ||
                          !values.items.some(
                            (line, lineIndex) =>
                              lineIndex !== index &&
                              line.productId === candidate.id,
                          ),
                      )
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.sku})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`invoice-quantity-${index}`}>Quantity</label>
                  <input
                    aria-describedby={
                      errors[`items.${index}.quantity`] === undefined
                        ? undefined
                        : `invoice-quantity-error-${index}`
                    }
                    aria-invalid={
                      errors[`items.${index}.quantity`] === undefined
                        ? undefined
                        : true
                    }
                    id={`invoice-quantity-${index}`}
                    min="1"
                    onChange={(event) =>
                      changeItem(index, "quantity", event.target.value)
                    }
                    step="1"
                    type="number"
                    value={item.quantity}
                  />
                  {errors[`items.${index}.quantity`] === undefined ? null : (
                    <p
                      className="field-error"
                      id={`invoice-quantity-error-${index}`}
                    >
                      {errors[`items.${index}.quantity`]}
                    </p>
                  )}
                </div>
                <p className="invoice-line-summary">
                  {product === undefined
                    ? "Select a product"
                    : `${product.name} · ${product.sku} · ${product.quantityOnHand} available · ${money(product.unitPriceCents)} each · ${money(lineTotal)}`}
                </p>
                <button
                  aria-label={`Remove product line ${index + 1}`}
                  className="danger-button"
                  disabled={pending || values.items.length === 1}
                  onClick={() => removeItem(index)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            );
          })}
          {errors.items === undefined ? null : (
            <p className="field-error">{errors.items}</p>
          )}
          <button
            className="secondary-button"
            disabled={pending || products.length <= values.items.length}
            onClick={addItem}
            type="button"
          >
            Add product line
          </button>
        </fieldset>
        <DraftTotals values={values} products={products} />
        <p className="draft-note">
          Draft preview only. The server recalculates and validates totals when
          saved.
        </p>
        {requestError === null ? null : (
          <p aria-live="polite" className="form-error" role="alert">
            {requestError}
          </p>
        )}
        <div className="form-actions">
          <button className="primary-button" disabled={pending} type="submit">
            {pending
              ? "Saving"
              : editing === null
                ? "Create invoice"
                : "Save draft"}
          </button>
          <button
            className="secondary-button"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function DraftTotals({
  values,
  products,
}: Readonly<{ values: FormValues; products: readonly Product[] }>) {
  const subtotal = values.items.reduce((total, item) => {
    const product = products.find(
      (candidate) => candidate.id === item.productId,
    );
    const quantity = Number.parseInt(item.quantity, 10);
    return product === undefined || !Number.isInteger(quantity) || quantity < 1
      ? total
      : total + product.unitPriceCents * quantity;
  }, 0);
  const tax = Math.round((subtotal * 1100) / 10000);
  return (
    <dl className="invoice-totals">
      <div>
        <dt>Draft subtotal</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      <div>
        <dt>Draft tax (11%)</dt>
        <dd>{money(tax)}</dd>
      </div>
      <div>
        <dt>Draft total</dt>
        <dd>{money(subtotal + tax)}</dd>
      </div>
    </dl>
  );
}

function InvoiceDetail({
  invoice,
  onClose,
  onEdit,
  onStatus,
  pending,
}: Readonly<{
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: Exclude<InvoiceStatus, "DRAFT">) => Promise<void>;
  pending: boolean;
}>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  const action = (
    status: Exclude<InvoiceStatus, "DRAFT">,
    label: string,
    confirm: string,
  ) => (
    <button
      className={status === "CANCELLED" ? "danger-button" : "secondary-button"}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirm)) void onStatus(status);
      }}
      type="button"
    >
      {pending ? "Working..." : label}
    </button>
  );
  return (
    <div
      aria-labelledby="invoice-detail-title"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
      role="dialog"
    >
      <article className="invoice-detail">
        <div className="product-form-heading">
          <div>
            <p className="section-label">Invoice detail</p>
            <h2 id="invoice-detail-title">{invoice.invoiceNumber}</h2>
          </div>
          <button
            aria-label="Close invoice detail"
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            &#215;
          </button>
        </div>
        <div className="invoice-detail-meta">
          <p>
            <strong>Customer</strong>
            {invoice.customerName}
          </p>
          <p>
            <strong>Status</strong>
            <span className={`status status-${invoice.status.toLowerCase()}`}>
              {invoice.status}
            </span>
          </p>
          <p>
            <strong>Issue date</strong>
            {dateDisplay(invoice.issueDate)}
          </p>
          {invoice.dueDate === null ? null : (
            <p>
              <strong>Due date</strong>
              {dateDisplay(invoice.dueDate)}
            </p>
          )}
        </div>
        {invoice.notes === null ? null : (
          <p className="invoice-notes">{invoice.notes}</p>
        )}
        <div className="invoice-detail-lines">
          {invoice.items.map((item) => (
            <div className="invoice-detail-line" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <span>
                  Snapshot price: {money(item.unitPriceCents)} · Qty{" "}
                  {item.quantity}
                </span>
              </div>
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
                onClick={onEdit}
                type="button"
              >
                Edit
              </button>
              {action(
                "ISSUED",
                "Issue invoice",
                "Issue this invoice and decrement stock?",
              )}
              {action(
                "CANCELLED",
                "Cancel invoice",
                "Cancel this draft invoice?",
              )}
            </>
          ) : invoice.status === "ISSUED" ? (
            <>
              {action("PAID", "Mark paid", "Mark this invoice as paid?")}
              {action(
                "CANCELLED",
                "Cancel invoice",
                "Cancel this invoice and restore stock?",
              )}
            </>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export function InvoicesScreen() {
  const [invoices, setInvoices] = useState<readonly Invoice[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState(false);
  const createRef = useRef<HTMLButtonElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    let active = true;
    void productsApi
      .list({ page: 1, pageSize: 100 })
      .then((result) => {
        if (active) setProducts(result.items);
      })
      .catch((requestError: unknown) => {
        if (active) setProductsError(messageFrom(requestError));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const current = requestId.current + 1;
    requestId.current = current;
    queueMicrotask(() => {
      if (current === requestId.current) {
        setLoading(true);
        setError(null);
      }
    });
    void invoicesApi
      .list({
        page,
        pageSize,
        status: status === "ALL" ? undefined : status,
        signal: controller.signal,
      })
      .then((result) => {
        if (current === requestId.current) {
          setInvoices(result.items);
          setTotal(result.total);
        }
      })
      .catch((requestError: unknown) => {
        if (current === requestId.current && !controller.signal.aborted)
          setError(messageFrom(requestError));
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshToken, status]);
  useEffect(() => {
    if (selectedId === null) return;
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    void invoicesApi
      .get(selectedId, controller.signal)
      .then(setSelected)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(messageFrom(requestError));
      });
    return () => controller.abort();
  }, [selectedId]);
  function refresh(): void {
    setRefreshToken((current) => current + 1);
  }
  async function saved(message: string): Promise<void> {
    setFormOpen(false);
    setNotice(message);
    refresh();
    (editing === null ? createRef.current : detailTriggerRef.current)?.focus();
    setEditing(null);
  }
  async function changeStatus(
    nextStatus: Exclude<InvoiceStatus, "DRAFT">,
  ): Promise<void> {
    if (selected === null || pendingStatus) return;
    setPendingStatus(true);
    setError(null);
    try {
      const result = await invoicesApi.changeStatus(selected.id, nextStatus);
      setNotice(result.message);
      setSelected(result.invoice);
      refresh();
    } catch (requestError: unknown) {
      setError(messageFrom(requestError));
    } finally {
      setPendingStatus(false);
    }
  }
  function openEdit(): void {
    if (selected?.status === "DRAFT") {
      setEditing(selected);
      setFormOpen(true);
    }
  }
  return (
    <section className="invoices-section" aria-labelledby="invoices-title">
      <div className="products-heading">
        <div>
          <p className="section-label">Billing</p>
          <h2 id="invoices-title">Invoices</h2>
        </div>
        <p className="product-count">
          {total} {total === 1 ? "invoice" : "invoices"}
        </p>
      </div>
      <button
        className="primary-button create-product-button"
        disabled={productsError !== null}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        ref={createRef}
        type="button"
      >
        Create invoice
      </button>
      {productsError === null ? null : (
        <p className="form-error" role="alert">
          {productsError}
        </p>
      )}
      {formOpen ? (
        <InvoiceForm
          editing={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
            (editing === null
              ? createRef.current
              : detailTriggerRef.current
            )?.focus();
          }}
          onSaved={saved}
          products={products}
        />
      ) : null}
      <div className="invoice-toolbar">
        <label htmlFor="invoice-status">Filter invoices</label>
        <select
          id="invoice-status"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as InvoiceStatus | "ALL");
          }}
          value={status}
        >
          <option value="ALL">All statuses</option>
          {statuses.map((invoiceStatus) => (
            <option key={invoiceStatus} value={invoiceStatus}>
              {invoiceStatus}
            </option>
          ))}
        </select>
      </div>
      {notice === null ? null : (
        <p aria-live="polite" className="form-success">
          {notice}
        </p>
      )}
      {error === null ? null : (
        <div className="inline-error">
          <p role="alert">{error}</p>
          <button
            className="secondary-button"
            onClick={() => refresh()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p aria-live="polite" className="list-status">
          Loading invoices...
        </p>
      ) : invoices.length === 0 ? (
        <div className="products-empty">
          <p className="section-label">Nothing here yet</p>
          <h3>No invoices match this filter.</h3>
        </div>
      ) : (
        <div className="invoice-list" aria-live="polite">
          {invoices.map((invoice) => (
            <button
              className="invoice-row"
              key={invoice.id}
              onClick={(event) => {
                detailTriggerRef.current = event.currentTarget;
                setSelected(null);
                setSelectedId(invoice.id);
              }}
              type="button"
            >
              <span>
                <strong>{invoice.invoiceNumber}</strong>
                <span>
                  {invoice.customerName} · {dateDisplay(invoice.issueDate)}
                </span>
              </span>
              <span className={`status status-${invoice.status.toLowerCase()}`}>
                {invoice.status}
              </span>
              <strong>{money(invoice.totalCents)}</strong>
            </button>
          ))}
        </div>
      )}
      <div className="pagination">
        <button
          className="secondary-button"
          disabled={loading || page <= 1}
          onClick={() => setPage((current) => current - 1)}
          type="button"
        >
          Previous
        </button>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button
          className="secondary-button"
          disabled={loading || page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Next
        </button>
      </div>
      {selected === null && selectedId !== null ? (
        <p aria-live="polite" className="list-status">
          Loading invoice detail...
        </p>
      ) : selected === null ? null : (
        <InvoiceDetail
          invoice={selected}
          onClose={() => {
            setSelectedId(null);
            setSelected(null);
            detailTriggerRef.current?.focus();
          }}
          onEdit={openEdit}
          onStatus={changeStatus}
          pending={pendingStatus}
        />
      )}
    </section>
  );
}
