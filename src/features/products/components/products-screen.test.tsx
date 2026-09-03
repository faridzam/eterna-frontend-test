import { ApiError } from "@/src/lib/api-client";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsScreen } from "./products-screen";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../services/products.api", () => ({ productsApi: mocks }));
const product = {
  id: "product-1",
  userId: "user-1",
  sku: "SF-100",
  name: "Packing tape",
  description: "Clear roll",
  unitPriceCents: 350,
  quantityOnHand: 4,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};
const result = (items = [product], total = items.length) => ({
  items,
  total,
  page: 1,
  pageSize: 10,
});

describe("ProductsScreen", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockReset().mockResolvedValue(result());
    mocks.create.mockReset().mockResolvedValue(product);
    mocks.update.mockReset().mockResolvedValue(product);
    mocks.remove.mockReset().mockResolvedValue(undefined);
  });

  it("debounces live search and trims the keyword sent to the API", async () => {
    render(<ProductsScreen />);
    await screen.findByText("Packing tape");
    mocks.list.mockReset().mockResolvedValue(result([]));
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "  box  " },
    });
    expect(mocks.list).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: "box" }),
    );
  });
  it("opens and closes the keyboard-accessible product modal", async () => {
    const interaction = userEvent.setup();
    render(<ProductsScreen />);
    await screen.findByText("Packing tape");
    const trigger = screen.getByRole("button", { name: "Create product" });
    await interaction.click(trigger);
    expect(screen.getByRole("dialog", { name: "Add stock" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Close product form" }),
    ).toHaveFocus();
    await interaction.keyboard("{Tab}");
    await interaction.keyboard("{Shift>}{Tab}{/Shift}");
    await interaction.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("preserves values and surfaces duplicate SKU errors", async () => {
    mocks.create.mockRejectedValueOnce(
      new ApiError("A product with that SKU already exists.", 409),
    );
    const interaction = userEvent.setup();
    render(<ProductsScreen />);
    await screen.findByText("Packing tape");
    await interaction.click(
      screen.getByRole("button", { name: "Create product" }),
    );
    await interaction.type(screen.getByLabelText("SKU"), "SF-200");
    await interaction.type(screen.getByLabelText("Name"), "Shipping box");
    await interaction.type(screen.getByLabelText("Price (cents)"), "225");
    await interaction.type(screen.getByLabelText("Quantity on hand"), "8");
    await interaction.click(
      screen.getByRole("button", { name: "Add product" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A product with that SKU already exists.",
    );
    expect(screen.getByDisplayValue("SF-200")).toBeVisible();
  });

  it("closes and refreshes after successful creation", async () => {
    const created = {
      ...product,
      id: "product-2",
      sku: "SF-200",
      name: "Shipping box",
    };
    mocks.list
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(result([product, created], 2));
    mocks.create.mockResolvedValueOnce(created);
    const interaction = userEvent.setup();
    render(<ProductsScreen />);
    await screen.findByText("Packing tape");
    await interaction.click(
      screen.getByRole("button", { name: "Create product" }),
    );
    await interaction.type(screen.getByLabelText("SKU"), "SF-200");
    await interaction.type(screen.getByLabelText("Name"), "Shipping box");
    await interaction.type(screen.getByLabelText("Price (cents)"), "225");
    await interaction.type(screen.getByLabelText("Quantity on hand"), "8");
    await interaction.click(
      screen.getByRole("button", { name: "Add product" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Shipping box")).toBeVisible();
  });

  it("distinguishes empty search and retryable load failures", async () => {
    mocks.list
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(result([]));
    const interaction = userEvent.setup();
    render(<ProductsScreen />);
    await screen.findByText("Packing tape");
    await interaction.type(screen.getByLabelText("Search products"), "BOX-999");
    await interaction.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByText("No products match 'BOX-999'."),
    ).toBeVisible();
    mocks.list.mockRejectedValueOnce(
      new ApiError("We could not load products.", 500),
    );
    await interaction.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not load products.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
