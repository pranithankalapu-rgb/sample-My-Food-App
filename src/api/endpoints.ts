// One typed function per backend endpoint (all 34 in src/data/api-inventory.json).
// Every function returns the full HttpResponse (data, status, headers, time).
import type { HttpClient, HttpMethod, HttpRequest, HttpResponse } from "./http";
import type * as T from "./types";

type Opts = Pick<HttpRequest, "signal" | "timeoutMs" | "token" | "onUploadProgress" | "retries">;

const enc = encodeURIComponent;

/** Lookups may wait for Open Food Facts (8 s) and the AI fallback (25 s). */
export const LOOKUP_TIMEOUT_MS = 45_000;
/** OCR waits up to 30 s upstream; photo analysis up to 60 s. */
export const SCAN_TIMEOUT_MS = 45_000;
export const ANALYZE_TIMEOUT_MS = 75_000;

function fileForm(field: string, files: Blob | Blob[] | undefined, name = "upload"): FormData {
  const form = new FormData();
  const list = files === undefined ? [] : Array.isArray(files) ? files : [files];
  list.forEach((file, i) => {
    form.append(field, file, file instanceof File ? file.name : `${name}-${i + 1}`);
  });
  return form;
}

export function createApi(http: HttpClient) {
  const call = <R>(method: HttpMethod, path: string, extra: Omit<HttpRequest, "method" | "path"> = {}) =>
    http.request<R>({ method, path, ...extra });

  return {
    system: {
      health: (o?: Opts) => call<T.HealthResponse>("GET", "/health", { token: null, ...o }),
      dependencies: (o?: Opts) =>
        call<T.DependencyHealthResponse>("GET", "/health/deps", { token: null, ...o }),
      uploadedImage: (file: string, o?: Opts) =>
        call<Blob>("GET", `/uploads/images/${enc(file)}`, { token: null, responseType: "blob", ...o }),
    },
    auth: {
      signup: (body: T.SignupRequest, o?: Opts) =>
        call<T.SignupResponse>("POST", "/user", { json: body, token: null, ...o }),
      login: (body: T.LoginRequest, o?: Opts) =>
        call<T.LoginResponse>("POST", "/login", { json: body, token: null, ...o }),
      socialSignIn: (body: T.SocialSignInRequest, o?: Opts) =>
        call<T.LoginResponse>("POST", "/user/social/signin", { json: body, token: null, ...o }),
      sendVerificationCode: (body: T.EmailRequest, o?: Opts) =>
        call<T.MessageResponse>("POST", "/user/verify/code", { json: body, token: null, ...o }),
      verify: (body: T.VerifyRequest, o?: Opts) =>
        call<T.MessageResponse>("POST", "/user/verify", { json: body, token: null, ...o }),
      forgotPasswordCode: (body: T.EmailRequest, o?: Opts) =>
        call<T.MessageResponse>("POST", "/user/forgotpassword/code", { json: body, token: null, ...o }),
      changePassword: (body: T.ChangePasswordRequest, o?: Opts) =>
        call<T.MessageResponse>("POST", "/user/changepassword", { json: body, token: null, ...o }),
    },
    user: {
      get: (id: string, o?: Opts) => call<T.UserDetailsResponse>("GET", `/user/${enc(id)}`, o),
      update: (id: string, body: T.UpdateUserRequest, o?: Opts) =>
        call<T.MessageResponse>("PUT", `/user/${enc(id)}`, { json: body, ...o }),
      remove: (id: string, o?: Opts) => call<T.MessageResponse>("DELETE", `/user/${enc(id)}`, o),
      incrementScan: (id: string, o?: Opts) =>
        call<T.ScanQuotaResponse>("PUT", `/user/${enc(id)}/increment-scan`, o),
      history: (id: string, o?: Opts) =>
        call<T.HistoryResponse>("GET", `/product/history/user/${enc(id)}`, o),
    },
    product: {
      lookup: (code: string, o?: Opts) =>
        call<T.ProductResponse>("GET", `/product/${enc(code)}`, {
          timeoutMs: LOOKUP_TIMEOUT_MS,
          retries: 0,
          ...o,
        }),
      list: (query: { page: number; limit: number }, o?: Opts) =>
        call<T.ProductListResponse>("GET", "/product", { query, ...o }),
      search: (body: T.SearchRequest, o?: Opts) =>
        call<T.SearchResponse>("POST", "/product/search", { json: body, ...o }),
      byCategory: (body: { category: string[] }, o?: Opts) =>
        call<T.RawListResponse>("POST", "/product/category", { json: body, ...o }),
      byAdditives: (body: { additives_tags: string[] }, o?: Opts) =>
        call<T.RawListResponse>("POST", "/product/additives", { json: body, ...o }),
      /** `fallback: "ai"`: when the OCR service is down, the API reads the label with AI instead. */
      scanLabel: (image: Blob | undefined, o?: Opts & { fallback?: "ai" }) => {
        const { fallback, ...rest } = o ?? {};
        return call<T.OcrResponse>("POST", "/product/scan", {
          form: fileForm("images", image, "label"),
          timeoutMs: SCAN_TIMEOUT_MS,
          ...(fallback ? { query: { fallback } } : {}),
          ...rest,
        });
      },
      analyzePhoto: (image: Blob | undefined, o?: Opts) =>
        call<T.AnalyzeResponse>("POST", "/product/analyze", {
          form: fileForm("images", image, "photo"),
          timeoutMs: ANALYZE_TIMEOUT_MS,
          ...o,
        }),
    },
    admin: {
      cmsLogin: (body: T.LoginRequest, o?: Opts) =>
        call<T.LoginResponse>("POST", "/cms/login", { json: body, token: null, ...o }),
      logout: (o?: Opts) => call<T.MessageResponse>("POST", "/cms/logout", o),
      reviewQueue: (query: { page?: number; limit?: number } = {}, o?: Opts) =>
        call<T.QueueResponse>("GET", "/cms/product-review", { query, ...o }),
      imageQueue: (query: { page?: number; limit?: number } = {}, o?: Opts) =>
        call<T.QueueResponse>("GET", "/cms/product-images", { query, ...o }),
      users: (query: { page?: number; limit?: number } = {}, o?: Opts) =>
        call<T.UsersPage>("GET", "/users", { query, ...o }),
      updateProduct: (body: T.UpdateProductRequest, o?: Opts) =>
        call<T.UpdateProductResponse>("PUT", "/product/update", { json: body, ...o }),
      deleteProduct: (code: string, o?: Opts) =>
        call<T.MessageResponse>("DELETE", `/product/${enc(code)}`, o),
      uploadMedia: (files: { images?: Blob[]; videos?: Blob[]; pdfs?: Blob[] }, o?: Opts) => {
        const form = new FormData();
        // the explorer may pass fields without files
        for (const [field, list] of Object.entries(files) as [string, Blob[] | undefined][]) {
          (list ?? []).forEach((file, i) => {
            form.append(field, file, file instanceof File ? file.name : `${field}-${i + 1}`);
          });
        }
        return call<T.UploadMediaResponse>("POST", "/media/upload", { form, ...o });
      },
      deleteMedia: (id: string, o?: Opts) => call<T.MessageResponse>("DELETE", `/media/${enc(id)}`, o),
    },
    billing: {
      add: (body: T.AddSubscriptionRequest, o?: Opts) =>
        call<T.AddSubscriptionResponse>("POST", "/subscription/add", { json: body, ...o }),
      extend: (body: T.ExtendSubscriptionRequest, o?: Opts) =>
        call<T.ExtendSubscriptionResponse>("PUT", "/subscription/extend", { json: body, ...o }),
      identifiers: (o?: Opts) => call<T.IdentifiersResponse>("GET", "/identifiers", { token: null, ...o }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

// ---------------------------------------------------------------- registry
// Maps every inventory id to its typed function, so the API Explorer sends
// requests through the same client and a unit test can prove 100% coverage.

export interface ExplorerInput {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  files: Record<string, File[]>;
  opts: Opts;
}

export interface RegistryEntry {
  method: HttpMethod;
  path: string;
  send: (api: Api, input: ExplorerInput) => Promise<HttpResponse<unknown>>;
}

const num = (value: string | undefined): number | undefined =>
  value === undefined || value === "" ? undefined : Number(value);
const p = (input: ExplorerInput, name: string): string => input.params[name] ?? "";
// The explorer sends whatever JSON the person typed (also invalid input, on
// purpose); the server validates it, so the typed body is not enforced here.
const bodyAs = (input: ExplorerInput): never => input.body as never;

export const endpointRegistry = {
  health: { method: "GET", path: "/health", send: (a, i) => a.system.health(i.opts) },
  "health.deps": { method: "GET", path: "/health/deps", send: (a, i) => a.system.dependencies(i.opts) },
  "uploads.static": {
    method: "GET",
    path: "/uploads/images/{file}",
    send: (a, i) => a.system.uploadedImage(p(i, "file"), i.opts),
  },
  "auth.signup": { method: "POST", path: "/user", send: (a, i) => a.auth.signup(bodyAs(i), i.opts) },
  "auth.login": { method: "POST", path: "/login", send: (a, i) => a.auth.login(bodyAs(i), i.opts) },
  "auth.social": {
    method: "POST",
    path: "/user/social/signin",
    send: (a, i) => a.auth.socialSignIn(bodyAs(i), i.opts),
  },
  "auth.sendVerificationCode": {
    method: "POST",
    path: "/user/verify/code",
    send: (a, i) => a.auth.sendVerificationCode(bodyAs(i), i.opts),
  },
  "auth.verify": { method: "POST", path: "/user/verify", send: (a, i) => a.auth.verify(bodyAs(i), i.opts) },
  "auth.forgotPasswordCode": {
    method: "POST",
    path: "/user/forgotpassword/code",
    send: (a, i) => a.auth.forgotPasswordCode(bodyAs(i), i.opts),
  },
  "auth.changePassword": {
    method: "POST",
    path: "/user/changepassword",
    send: (a, i) => a.auth.changePassword(bodyAs(i), i.opts),
  },
  "user.get": { method: "GET", path: "/user/{id}", send: (a, i) => a.user.get(p(i, "id"), i.opts) },
  "user.update": {
    method: "PUT",
    path: "/user/{id}",
    send: (a, i) => a.user.update(p(i, "id"), bodyAs(i), i.opts),
  },
  "user.delete": { method: "DELETE", path: "/user/{id}", send: (a, i) => a.user.remove(p(i, "id"), i.opts) },
  "user.incrementScan": {
    method: "PUT",
    path: "/user/{id}/increment-scan",
    send: (a, i) => a.user.incrementScan(p(i, "id"), i.opts),
  },
  "user.history": {
    method: "GET",
    path: "/product/history/user/{id}",
    send: (a, i) => a.user.history(p(i, "id"), i.opts),
  },
  "product.lookup": {
    method: "GET",
    path: "/product/{code}",
    send: (a, i) => a.product.lookup(p(i, "code"), i.opts),
  },
  "product.list": {
    method: "GET",
    path: "/product",
    send: (a, i) => a.product.list({ page: num(i.query.page) ?? 1, limit: num(i.query.limit) ?? 12 }, i.opts),
  },
  "product.search": {
    method: "POST",
    path: "/product/search",
    send: (a, i) => a.product.search(bodyAs(i), i.opts),
  },
  "product.byCategory": {
    method: "POST",
    path: "/product/category",
    send: (a, i) => a.product.byCategory(bodyAs(i), i.opts),
  },
  "product.byAdditives": {
    method: "POST",
    path: "/product/additives",
    send: (a, i) => a.product.byAdditives(bodyAs(i), i.opts),
  },
  "product.scanLabel": {
    method: "POST",
    path: "/product/scan",
    send: (a, i) => a.product.scanLabel(i.files.images?.[0], i.opts),
  },
  "product.analyzePhoto": {
    method: "POST",
    path: "/product/analyze",
    send: (a, i) => a.product.analyzePhoto(i.files.images?.[0], i.opts),
  },
  "cms.login": { method: "POST", path: "/cms/login", send: (a, i) => a.admin.cmsLogin(bodyAs(i), i.opts) },
  "cms.logout": { method: "POST", path: "/cms/logout", send: (a, i) => a.admin.logout(i.opts) },
  "cms.reviewQueue": {
    method: "GET",
    path: "/cms/product-review",
    send: (a, i) => a.admin.reviewQueue({ page: num(i.query.page), limit: num(i.query.limit) }, i.opts),
  },
  "cms.imageQueue": {
    method: "GET",
    path: "/cms/product-images",
    send: (a, i) => a.admin.imageQueue({ page: num(i.query.page), limit: num(i.query.limit) }, i.opts),
  },
  "admin.users": {
    method: "GET",
    path: "/users",
    send: (a, i) => a.admin.users({ page: num(i.query.page), limit: num(i.query.limit) }, i.opts),
  },
  "admin.updateProduct": {
    method: "PUT",
    path: "/product/update",
    send: (a, i) => a.admin.updateProduct(bodyAs(i), i.opts),
  },
  "admin.deleteProduct": {
    method: "DELETE",
    path: "/product/{code}",
    send: (a, i) => a.admin.deleteProduct(p(i, "code"), i.opts),
  },
  "admin.uploadMedia": {
    method: "POST",
    path: "/media/upload",
    send: (a, i) =>
      a.admin.uploadMedia({ images: i.files.images, videos: i.files.videos, pdfs: i.files.pdfs }, i.opts),
  },
  "admin.deleteMedia": {
    method: "DELETE",
    path: "/media/{id}",
    send: (a, i) => a.admin.deleteMedia(p(i, "id"), i.opts),
  },
  "billing.add": {
    method: "POST",
    path: "/subscription/add",
    send: (a, i) => a.billing.add(bodyAs(i), i.opts),
  },
  "billing.extend": {
    method: "PUT",
    path: "/subscription/extend",
    send: (a, i) => a.billing.extend(bodyAs(i), i.opts),
  },
  "billing.identifiers": {
    method: "GET",
    path: "/identifiers",
    send: (a, i) => a.billing.identifiers(i.opts),
  },
} satisfies Record<string, RegistryEntry>;

export type EndpointId = keyof typeof endpointRegistry;
