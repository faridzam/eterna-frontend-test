import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicesScreen } from "./invoices-screen";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  updateDraft: vi.fn(),
  changeStatus: vi.fn(),
  products: vi.fn(),
}));
vi.mock("../services/invoices.api", () => ({
  invoicesApi: {
    list: mocks.list,
    get: mocks.get,
    create: mocks.create,
    updateDraft: mocks.updateDraft,
    changeStatus: mocks.changeStatus,
  },
}));
vi.mock("../../products/services/products.api", () => ({
  productsApi: { list: mocks.products },
}));
const product = {
  id: "product-1",
  userId: "user-1",
  sku: "SF-100",
  name: "Packing tape",
  description: null,
  unitPriceCents: 350,
  quantityOnHand: 4,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};
const invoice = {
  id: "invoice-1",
  userId: "user-1",
  invoiceNumber: "INV-2026-0001",
  customerName: "Acme",
  issueDate: "2026-09-03T00:00:00.000Z",
  dueDate: null,
  status: "DRAFT" as const,
  version: 1,
  notes: null,
  subtotalCents: 350,
  taxAmountCents: 39,
  totalCents: 389,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  items: [
    {
      id: "item-1",
      invoiceId: "invoice-1",
      productId: "product-1",
      productName: "Packing tape",
      unitPriceCents: 350,
      quantity: 1,
      lineTotalCents: 350,
    },
  ],
};
const page = (items = [invoice]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
});

describe("InvoicesScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.products.mockResolvedValue({
      items: [product],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    mocks.list.mockResolvedValue(page());
    mocks.get.mockResolvedValue(invoice);
    mocks.create.mockResolvedValue({
      message: "Invoice created successfully.",
      invoice,
    });
  });
  it("shows loading, renders rows, filters, and opens detail actions", async () => {
    let resolveList: ((value: ReturnType<typeof page>) => void) | undefined;
    mocks.list.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    render(<InvoicesScreen />);
    expect(screen.getByText("Loading invoices...")).toBeVisible();
    resolveList?.(page());
    expect(await screen.findByText("INV-2026-0001")).toBeVisible();
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText("Filter invoices"), "ISSUED");
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: "ISSUED" }),
      ),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /INV-2026-0001/ }));
    expect(
      await screen.findByRole("dialog", { name: "INV-2026-0001" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Issue invoice" })).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("dialog", { name: "Edit invoice" }),
    ).toBeVisible();
    expect(
      screen.getByRole("dialog", { name: "INV-2026-0001" }),
    ).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Close invoice form" }));
    expect(
      screen.queryByRole("dialog", { name: "Edit invoice" }),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Close invoice detail" }));
    expect(
      screen.queryByRole("dialog", { name: "INV-2026-0001" }),
    ).not.toBeInTheDocument();
  });
  it("validates the creation form and previews integer-cent totals", async () => {
    const user = userEvent.setup();
    render(<InvoicesScreen />);
    await screen.findByText("INV-2026-0001");
    await user.click(screen.getByRole("button", { name: "Create invoice" }));
    const dialog = screen.getByRole("dialog", { name: "Create invoice" });
    await user.click(
      within(dialog).getByRole("button", { name: "Create invoice" }),
    );
    expect(screen.getByText("Customer name is required.")).toBeVisible();
    expect(screen.getByText("Select a product.")).toBeVisible();
    await user.type(screen.getByLabelText("Customer name"), "Acme");
    await user.selectOptions(screen.getByLabelText("Product 1"), "product-1");
    expect(screen.getAllByText("$3.50").length).toBeGreaterThan(0);
    expect(screen.getByText("$0.39")).toBeVisible();
    expect(screen.getAllByText("$3.89").length).toBeGreaterThan(0);
  });
});
