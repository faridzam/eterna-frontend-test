import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "./auth.api";

describe("authApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates and returns the backend registration message with user data", async () => {
    const result = {
      message: "Registration completed by the StockFlow API.",
      data: {
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(result), { status: 201 }),
    );

    await expect(
      authApi.register({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "correct-password",
      }),
    ).resolves.toEqual(result);
  });

  it("rejects a registration response without a non-empty message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "",
          data: {
            id: "user-1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }),
        { status: 201 },
      ),
    );

    await expect(
      authApi.register({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "correct-password",
      }),
    ).rejects.toThrow("unexpected response");
  });
});
