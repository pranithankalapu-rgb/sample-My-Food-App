import raw from "./api-inventory.json";

export type AuthLevel = "none" | "user" | "self_or_admin" | "admin";

export interface InventoryField {
  name: string;
  in?: string;
  type: string;
  required: boolean;
  rules?: string;
}

export interface InventoryResponse {
  status: number;
  when: string;
  body?: unknown;
  headers?: string;
}

export interface InventoryEndpoint {
  id: string;
  group: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: AuthLevel;
  rateLimit: string | null;
  contentType?: string;
  params: InventoryField[];
  query: InventoryField[];
  body: InventoryField[];
  responses: InventoryResponse[];
  dataSource: string[];
  purpose: string;
  example: { params?: Record<string, unknown>; query?: Record<string, unknown>; body?: unknown };
  coverage: { webApp: string[]; webAppTests: string[]; backendTests: string[] };
}

export interface Inventory {
  meta: {
    title: string;
    backendCommit: string;
    registrationCount: { router: number; app: number; total: number };
    errorFormatNote: string;
    commonErrors: Record<string, { status: number; body: unknown }>;
    [key: string]: unknown;
  };
  endpoints: InventoryEndpoint[];
}

export const inventory = raw as unknown as Inventory;

export const AUTH_LABELS: Record<AuthLevel, string> = {
  none: "Public",
  user: "Signed in",
  self_or_admin: "Self or admin",
  admin: "Admin only",
};
