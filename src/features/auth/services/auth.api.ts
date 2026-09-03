import { apiRequest } from "@/src/lib/api-client";
import { z } from "zod";

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});
const userEnvelopeSchema = z.object({ data: userSchema });
const registerResponseSchema = z.object({
  message: z.string().min(1),
  data: userSchema,
});

export type AuthenticatedUser = z.infer<typeof userSchema>;
export type RegisterResult = z.infer<typeof registerResponseSchema>;
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
  async login(payload: LoginPayload): Promise<AuthenticatedUser> {
    return (
      await apiRequest(
        "/auth/login",
        { method: "POST", body: JSON.stringify(payload) },
        z.object({ data: z.object({ user: userSchema }) }),
      )
    ).data.user;
  },
  async me(): Promise<AuthenticatedUser> {
    return (await apiRequest("/auth/me", { method: "GET" }, userEnvelopeSchema))
      .data;
  },
  async logout(): Promise<void> {
    await apiRequest("/auth/logout", { method: "POST" }, z.null());
  },
};
