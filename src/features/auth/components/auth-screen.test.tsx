import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { AuthScreen } from "./auth-screen";

const user = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
};
function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function renderScreen() {
  return render(
    <AuthProvider>
      <AuthScreen />
    </AuthProvider>,
  );
}

describe("AuthScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits login through the credentialed API adapter without storing a token", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, { message: "Authentication is required." }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Signed in successfully.",
          data: { user },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Products retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 10 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Products retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 100 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Invoices retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 10 },
        }),
      );
    const interaction = userEvent.setup();
    renderScreen();
    await interaction.type(
      await screen.findByLabelText("Email address"),
      user.email,
    );
    await interaction.type(
      screen.getByLabelText("Password"),
      "correct-password",
    );
    await interaction.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", { name: "Welcome back, Ada Lovelace" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:8000/auth/login",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows local validation errors and prevents duplicate pending submissions", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, { message: "Authentication is required." }),
      )
      .mockImplementationOnce(() => new Promise(() => undefined));
    const interaction = userEvent.setup();
    renderScreen();
    await interaction.click(
      await screen.findByRole("button", { name: "Sign in" }),
    );
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeVisible();
    await interaction.type(screen.getByLabelText("Email address"), user.email);
    await interaction.type(
      screen.getByLabelText("Password"),
      "correct-password",
    );
    await interaction.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Please wait" }),
      ).toBeDisabled(),
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("renders the exact backend registration message after switching to login", async () => {
    const backendMessage = "Registration completed by the StockFlow API.";
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, { message: "Authentication is required." }),
      )
      .mockResolvedValueOnce(
        jsonResponse(201, {
          message: backendMessage,
          data: user,
        }),
      );
    const interaction = userEvent.setup();
    renderScreen();
    await interaction.click(
      await screen.findByRole("button", { name: "Need an account? Register" }),
    );
    await interaction.type(screen.getByLabelText("Name"), user.name);
    await interaction.type(screen.getByLabelText("Email address"), user.email);
    await interaction.type(
      screen.getByLabelText("Password"),
      "correct-password",
    );
    await interaction.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    expect(screen.getByText(backendMessage)).toBeVisible();
    expect(
      screen.queryByText("Account created successfully. Please sign in."),
    ).not.toBeInTheDocument();
  });

  it("returns to an unauthenticated screen after logout", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Authenticated user retrieved successfully.",
          data: user,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Products retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 10 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Products retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 100 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          message: "Invoices retrieved successfully.",
          data: { items: [], total: 0, page: 1, pageSize: 10 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { message: "Signed out successfully.", data: null }),
      );
    const interaction = userEvent.setup();
    renderScreen();
    await interaction.click(
      await screen.findByRole("button", { name: "Sign out" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
  });
});
