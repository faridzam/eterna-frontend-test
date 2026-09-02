import { ApiError } from "@/src/lib/api-client";

export function safeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 401 ? "Your email or password is incorrect." : error.message;
  }
  return "The request could not be completed. Please try again.";
}