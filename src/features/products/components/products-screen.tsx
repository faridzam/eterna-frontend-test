"use client";

import { ApiError } from "@/src/lib/api-client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { z } from "zod";
import {
  productsApi,
  type Product,
  type ProductInput,
} from "../services/products.api";

const pageSize = 10;
const formSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required.").max(100),
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().max(2000),
  unitPriceCents: z.coerce
    .number()
    .int("Price must be whole cents.")
    .min(0, "Price cannot be negative."),
  quantityOnHand: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(0, "Quantity cannot be negative."),
});
type FormValues = {
  sku: string;
  name: string;
  description: string;
  unitPriceCents: string;
  quantityOnHand: string;
};
type FormErrors = Partial<Record<keyof FormValues, string>>;
const blank: FormValues = {
  sku: "",
  name: "",
  description: "",
  unitPriceCents: "",
  quantityOnHand: "",
};
const messageFrom = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "The request could not be completed. Please try again.";
function serverFields(error: unknown): FormErrors {
  if (!(error instanceof ApiError)) return {};
  const result: FormErrors = {};
  for (const message of error.messages) {
    const field = message.match(
      /^(sku|name|description|unitPriceCents|quantityOnHand)\b/i,
    )?.[1];
    if (field !== undefined && result[field as keyof FormValues] === undefined)
      result[field as keyof FormValues] = message;
  }
  return result;
}

function ProductForm({
  product,
  onCancel,
  onSaved,
}: Readonly<{
  product: Product | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}>) {
  const [values, setValues] = useState<FormValues>(() =>
    product === null
      ? blank
      : {
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          unitPriceCents: String(product.unitPriceCents),
          quantityOnHand: String(product.quantityOnHand),
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
        dialog.querySelectorAll<HTMLElement>("button, input, textarea"),
      ).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  function change(field: keyof FormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          typeof field === "string" &&
          next[field as keyof FormValues] === undefined
        )
          next[field as keyof FormValues] = issue.message;
      }
      setErrors(next);
      return;
    }
    const payload: ProductInput = {
      ...parsed.data,
      description: parsed.data.description || undefined,
    };
    setPending(true);
    setRequestError(null);
    try {
      if (product === null) await productsApi.create(payload);
      else await productsApi.update(product.id, payload);
      await onSaved();
    } catch (error: unknown) {
      setErrors(serverFields(error));
      setRequestError(messageFrom(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      aria-labelledby="product-dialog-title"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      ref={dialogRef}
      role="dialog"
    >
      <form
        className="product-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="product-form-heading">
          <div>
            <p className="section-label">
              {product === null ? "New product" : "Edit product"}
            </p>
            <h2 id="product-dialog-title">
              {product === null ? "Add stock" : "Update product"}
            </h2>
          </div>
          <button
            aria-label="Close product form"
            className="modal-close"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            &#215;
          </button>
        </div>
        <div className="product-form-grid">
          {(
            [
              "sku",
              "name",
              "description",
              "unitPriceCents",
              "quantityOnHand",
            ] as const
          ).map((field) => {
            const labels = {
              sku: "SKU",
              name: "Name",
              description: "Description",
              unitPriceCents: "Price (cents)",
              quantityOnHand: "Quantity on hand",
            };
            const id = `product-${field}`;
            const errorId = `${id}-error`;
            return (
              <div
                className={`field ${field === "description" ? "field-wide" : ""}`}
                key={field}
              >
                <label htmlFor={id}>{labels[field]}</label>
                {field === "description" ? (
                  <textarea
                    aria-describedby={
                      errors[field] === undefined ? undefined : errorId
                    }
                    aria-invalid={
                      errors[field] === undefined ? undefined : true
                    }
                    id={id}
                    onChange={(event) => change(field, event.target.value)}
                    value={values[field]}
                  />
                ) : (
                  <input
                    aria-describedby={
                      errors[field] === undefined ? undefined : errorId
                    }
                    aria-invalid={
                      errors[field] === undefined ? undefined : true
                    }
                    id={id}
                    onChange={(event) => change(field, event.target.value)}
                    type={
                      field === "sku" || field === "name" ? "text" : "number"
                    }
                    value={values[field]}
                  />
                )}
                {errors[field] === undefined ? null : (
                  <p className="field-error" id={errorId}>
                    {errors[field]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {requestError === null ? null : (
          <p className="form-error" role="alert">
            {requestError}
          </p>
        )}
        <div className="form-actions">
          <button className="primary-button" disabled={pending} type="submit">
            {pending
              ? "Saving"
              : product === null
                ? "Add product"
                : "Save changes"}
          </button>
          {product === null ? null : (
            <button
              className="secondary-button"
              disabled={pending}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function ProductsScreen() {
  const [items, setItems] = useState<readonly Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loadProducts = useCallback(
    async (requestedPage: number, requestedSearch: string): Promise<void> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      setItems([]);
      setTotal(0);
      setLoading(true);
      setError(null);
      try {
        const result = await productsApi.list({
          page: requestedPage,
          pageSize,
          search: requestedSearch,
          signal: controller.signal,
        });
        if (currentRequest !== requestId.current) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (requestError: unknown) {
        if (currentRequest !== requestId.current || controller.signal.aborted)
          return;
        setError(messageFrom(requestError));
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadProducts(page, search);
    });
    return () => {
      active = false;
      controllerRef.current?.abort();
    };
  }, [loadProducts, page, search]);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search, searchInput]);
  async function reload(): Promise<void> {
    await loadProducts(page, search);
  }
  async function remove(product: Product): Promise<void> {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setDeleting(product.id);
    try {
      await productsApi.remove(product.id);
      setNotice("Product deleted successfully.");
      if (items.length === 1 && page > 1) {
        setLoading(true);
        setPage((current) => current - 1);
      } else await reload();
    } catch (requestError: unknown) {
      setError(messageFrom(requestError));
    } finally {
      setDeleting(null);
    }
  }
  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    createButtonRef.current?.focus();
  }
  async function saved(): Promise<void> {
    closeForm();
    setNotice(null);
    await reload();
  }
  function searchProducts(): void {
    const nextSearch = searchInput.trim();
    if (nextSearch === search && page === 1) {
      void reload();
      return;
    }
    setPage(1);
    setSearch(nextSearch);
  }
  return (
    <section className="products-section" aria-labelledby="products-title">
      <div className="products-heading">
        <div>
          <p className="section-label">Inventory</p>
          <h2 id="products-title">Products</h2>
        </div>
        <p className="product-count">
          {total} active {total === 1 ? "product" : "products"}
        </p>
      </div>
      <button
        className="primary-button create-product-button"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        ref={createButtonRef}
        type="button"
      >
        Create product
      </button>
      {formOpen ? (
        <ProductForm
          key={editing?.id ?? "new"}
          product={editing}
          onCancel={closeForm}
          onSaved={saved}
        />
      ) : null}
      <form
        className="product-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          searchProducts();
        }}
      >
        <label htmlFor="product-search">Search products</label>
        <div className="search-row">
          <input
            id="product-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or SKU"
            type="search"
            value={searchInput}
          />
          <button className="secondary-button" type="submit">
            Search
          </button>
        </div>
      </form>
      {notice === null ? null : (
        <p className="form-success" aria-live="polite">
          {notice}
        </p>
      )}
      {error === null ? null : (
        <div className="inline-error">
          <p role="alert">{error}</p>
          <button
            className="secondary-button"
            onClick={() => void reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p className="list-status" aria-live="polite">
          Loading products...
        </p>
      ) : items.length === 0 ? (
        <div className="products-empty">
          <p className="section-label">
            {search === "" ? "Nothing here yet" : "Search complete"}
          </p>
          <h3>
            {search === ""
              ? "No products have been created yet."
              : `No products match '${search}'.`}
          </h3>
        </div>
      ) : (
        <div className="product-list" aria-live="polite">
          {items.map((product) => (
            <article className="product-row" key={product.id}>
              <div>
                <p className="product-sku">{product.sku}</p>
                <h3>{product.name}</h3>
                {product.description === null ? null : (
                  <p className="product-description">{product.description}</p>
                )}
              </div>
              <div className="product-metrics">
                <strong>{price(product.unitPriceCents)}</strong>
                <span>{product.quantityOnHand} in stock</span>
              </div>
              <div className="product-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(product);
                    setFormOpen(true);
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="danger-button"
                  disabled={deleting === product.id}
                  onClick={() => void remove(product)}
                  type="button"
                >
                  {deleting === product.id ? "Deleting" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <nav className="pagination" aria-label="Product pages">
        <button
          className="secondary-button"
          disabled={loading || page <= 1}
          onClick={() => setPage((current) => current - 1)}
          type="button"
        >
          Previous
        </button>
        <span>
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
      </nav>
    </section>
  );
}
function price(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
