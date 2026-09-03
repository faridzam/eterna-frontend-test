import { apiRequest } from "@/src/lib/api-client";
import { z } from "zod";

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  createdAt: z.string().datetime(),
});
const userEnvelopeSchema = z.object({
  message: z.string().min(1),
  data: userSchema,
});
const registerResponseSchema = z.object({
  message: z.string().min(1),
  data: userSchema,
});
const loginResponseSchema = z.object({
  message: z.string().min(1),
  data: z.object({ user: userSchema }),
});

export type AuthenticatedUser = z.infer<typeof userSchema>;
export type RegisterResult = z.infer<typeof registerResponseSchema>;
export type LoginResult = z.infer<typeof loginResponseSchema>;
export interface LoginPayload {
  readonly email: string;
  readonly password: string;
}
export interface RegisterPayload extends LoginPayload {
  readonly name: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    return apiRequest(
      "/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
      registerResponseSchema,
    );
  },
  async login(payload: LoginPayload): Promise<LoginResult> {
    return apiRequest(
      "/auth/login",
      { method: "POST", body: JSON.stringify(payload) },
      loginResponseSchema,
    );
  },
  async me(): Promise<AuthenticatedUser> {
    return (await apiRequest("/auth/me", { method: "GET" }, userEnvelopeSchema))
      .data;
  },
  async logout(): Promise<void> {
    await apiRequest(
      "/auth/logout",
      { method: "POST" },
      z.object({ message: z.string().min(1), data: z.null() }),
    );
  },
};
