import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiRequest } from "./api-client";

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes credentials when parsing a valid response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: "ok" }), { status: 200 }),
    );
    await expect(
      apiRequest("/test", { method: "GET" }, z.object({ data: z.string() })),
    ).resolves.toEqual({ data: "ok" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3000/test",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rejects malformed successful responses without exposing raw payloads", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { internal: "unexpected" } }), {
        status: 200,
      }),
    );
    await expect(
      apiRequest("/test", { method: "GET" }, z.object({ data: z.string() })),
    ).rejects.toEqual(
      new ApiError(
        "StockFlow returned an unexpected response. Please try again.",
      ),
    );
  });
});
