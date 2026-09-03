import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly messages: readonly string[] = [message],
  ) {
    super(message);
  }
}

export const unauthorizedEvent = "stockflow:unauthorized";

const errorSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
});
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiBaseUrl = (
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:8000")
)?.replace(/\/$/, "");

function errorMessages(payload: unknown): string[] {
  const parsed = errorSchema.safeParse(payload);
  if (!parsed.success || parsed.data.message === undefined) {
    return ["The request could not be completed. Please try again."];
  }
  return Array.isArray(parsed.data.message)
    ? parsed.data.message
    : [parsed.data.message];
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  if (apiBaseUrl === undefined) {
    throw new ApiError(
      "StockFlow API is not configured. Set NEXT_PUBLIC_API_BASE_URL before building the application.",
    );
  }
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(
      "Unable to reach StockFlow. Check your connection and try again.",
    );
  }

  const payload: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const messages = errorMessages(payload);
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(unauthorizedEvent));
    }
    throw new ApiError(messages.join(" "), response.status, messages);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      "StockFlow returned an unexpected response. Please try again.",
    );
  }
  return parsed.data;
}
