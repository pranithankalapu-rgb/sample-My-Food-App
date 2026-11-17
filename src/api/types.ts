// Request and response types for every endpoint in src/data/api-inventory.json.
// Field names follow the backend exactly (snake_case), so nothing is renamed.

export type Uuid = string;
export type IsoDate = string;

// ---------------------------------------------------------------- users
export interface PublicUser {
  id: Uuid;
  first_name: string | null;
  last_name: string | null;
  email: string;
  mobile?: string | number | null;
  role: string;
  /** "PENDING" or "VERIFIED" */
  email_verification_status?: string;
  is_active?: boolean;
  type?: string | null;
  user_scan_count?: number | null;
  user_info?: UserInfo | null;
  created_at?: IsoDate;
  updated_at?: IsoDate;
}

export interface UserInfo {
  health_conditions?: string[];
  allergies?: string[];
  allergens?: string[];
  [key: string]: unknown;
}

export interface Subscription {
  id: Uuid;
  user_id: Uuid;
  from_date: IsoDate;
  to_date: IsoDate;
  payment_status: PaymentStatus;
  transaction_id: string;
  created_at?: IsoDate;
}
export type PaymentStatus = "pending" | "completed" | "failed";

export interface UserDetails extends PublicUser {
  total_scan_limit: number;
  subscription_details: Subscription[];
  active_subscription: { from_date: IsoDate; to_date: IsoDate } | null;
}

export interface QuotaInfo {
  total_scans: number;
  scanned_count: number;
  remaining_scans: number;
}

export interface SignupRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  repassword: string;
  mobile?: number;
}
export interface SignupResponse {
  status: 201;
  message: string;
  user: PublicUser;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  status: 200;
  message: string;
  user: PublicUser;
  token: string;
}
export interface SocialSignInRequest {
  token: string;
  provider: string;
}
export interface EmailRequest {
  email: string;
}
export interface VerifyRequest {
  email: string;
  code: string;
}
export interface ChangePasswordRequest {
  email: string;
  code: string;
  new_password: string;
}
export interface MessageResponse {
  message: string;
  status?: number | string;
}
export interface UserDetailsResponse {
  status: 200;
  user: UserDetails;
}
export interface UpdateUserRequest {
  user_info: UserInfo;
}
export interface ScanQuotaResponse {
  message: string;
  info: QuotaInfo;
}
export interface HistoryEntry {
  id: Uuid | number;
  product_code: string;
  user_id: Uuid;
  product_name: string | null;
  created_at: IsoDate;
  updated_at: IsoDate;
}
export interface HistoryResponse {
  productHistory: HistoryEntry[];
}
export interface UsersPage {
  status: 200;
  data: PublicUser[];
  pagination: { totalUsers: number; currentPage: number; totalPages: number };
}

// ---------------------------------------------------------------- products
/** "openfoodfacts" | "usda" | "ai" | "cms" (open: new sources may appear) */
export type DataSource = string;
export type VerdictValue = "recommended" | "not_recommended" | "insufficient_data";

/** The personal verdict scored by the API (scoring.js), e.g. product.isRecommended. */
export interface VerdictResult {
  recommended: boolean;
  verdict: VerdictValue;
  /** generic: { goodPoints, badPoints }; with health conditions: per-condition checks */
  report?: unknown;
  missing_data?: string[];
  unsupported_conditions?: string[];
  [key: string]: unknown;
}

/** Older builds sent a boolean or a bare string; current ones send VerdictResult. */
export type Verdict = VerdictResult | VerdictValue | boolean;

export interface ImageVariantSet {
  small?: Record<string, string>;
  thumb?: Record<string, string>;
  display?: Record<string, string>;
  sizes?: Record<string, Record<string, { w: number; h: number }>>;
}

export interface UploadedImage {
  url: string;
  width?: number;
  height?: number;
  source?: string;
  type?: string;
  file_id?: string;
  mime_type?: string;
}

export interface SelectedImages {
  front?: ImageVariantSet;
  ingredients?: ImageVariantSet;
  nutrition?: ImageVariantSet;
  packaging?: ImageVariantSet;
  main?: unknown;
  uploaded_images?: UploadedImage[];
  [key: string]: unknown;
}

export interface ImageFields {
  image_url: string | null;
  image_thumb_url: string | null;
  image_width: number | null;
  image_height: number | null;
  image_source: string | null;
  image_chosen_by: "admin" | "auto" | null;
  needs_better_image: boolean;
}

export type Nutriments = Record<string, number | string | null | undefined>;

export interface SourceInfo {
  provider?: string;
  vendor?: string;
  model?: string;
  ai_nutrition?: boolean;
  verified_at?: IsoDate;
  fallback_fields?: string[];
  needs_better_image?: boolean;
  [key: string]: unknown;
}

export interface Product extends ImageFields {
  id?: number | string;
  code: string;
  product_name: string;
  product_name_en: string;
  generic_name: string;
  brands: string;
  categories: string;
  categories_tags: string[];
  countries: string;
  countries_tags?: string[] | null;
  ingredients_text: string;
  ingredients_text_with_allergens: string;
  ingredients: unknown[];
  allergens: string;
  allergens_tags?: string[] | null;
  allergens_hierarchy: string[];
  traces?: string | null;
  traces_tags?: string[] | null;
  additives_tags: string[];
  nutriments: Nutriments;
  nutrition_data_per: string;
  nutriscore_grade: string | string[];
  nutriscore_score: number;
  nova_group?: number | null;
  product_quantity: string | number;
  product_quantity_unit: string;
  product_type: string;
  selected_images: SelectedImages;
  data_source: DataSource | null;
  source_info: SourceInfo | null;
  verified_at?: IsoDate | null;
  isRecommended: Verdict;
  createdAt?: IsoDate;
  updatedAt?: IsoDate;
  created_at?: IsoDate;
  updated_at?: IsoDate;
  [key: string]: unknown;
}

export interface ProductResponse {
  product: Product;
}

/** A row of the products listing (search, browse, admin lists). */
export interface ListingProduct extends Partial<ImageFields> {
  id?: number | string;
  code: string;
  product_name: string;
  categories?: string[] | null;
  additives_tags?: string[] | null;
  countries?: string[] | null;
  selected_images?: SelectedImages | null;
  created_at?: IsoDate;
  updated_at?: IsoDate;
}

export interface ProductListResponse {
  data: ListingProduct[];
  pageInfo: { total: number; page: number; pages: number };
}

export type SearchFilterName = "product_name" | "categories" | "additives_tags" | "countries";
export interface SearchFilter {
  /** honoured: SearchFilterName; other names are accepted and ignored by the API */
  name: string;
  value: string | string[];
}
export interface SearchRequest {
  query?: string | null;
  filters?: SearchFilter[];
  page?: number;
  page_size?: number;
}
export interface SearchResponse {
  page_no: number;
  pageSize: number;
  /** a string, as Postgres count() returned it */
  totalSearchResultsCount: string;
  results: ListingProduct[];
}
export interface RawListResponse {
  data: ListingProduct[];
}

export interface OcrResponse {
  ocrData: unknown;
}

export interface PhotoReport {
  is_food: boolean;
  kind: string;
  confidence?: number | string;
  name?: string;
  brand?: string | null;
  description?: string;
  barcode?: string | null;
  known_product?: boolean;
  items?: unknown;
  categories?: unknown;
  is_drink?: boolean;
  quantity?: { amount: number; unit: string } | null;
  ingredients?: { text: string | null; source?: string };
  allergens?: { contains: string[]; may_contain: string[] };
  nutrition?: {
    basis: string;
    source: string;
    values: Nutriments;
    serving: { amount: number; unit: string } | null;
  };
  nova_group?: number | null;
  additives?: unknown;
  health_notes?: unknown;
  safety_notes?: unknown;
  verdict?: Verdict;
  disclaimer: string;
}
export interface AnalyzeResponse {
  report: PhotoReport;
  model?: string;
}

// ---------------------------------------------------------------- admin
export interface QueueResponse {
  data: (ListingProduct & {
    brands?: string | null;
    data_source?: DataSource | null;
    source_info?: SourceInfo | null;
  })[];
  pageInfo: { total: number; page: number; pages: number };
}
export interface UpdateProductRequest {
  product_code: string;
  product_details: Partial<Product> & Record<string, unknown>;
  expected_updated_at?: IsoDate;
  mark_verified?: boolean;
}
export interface UpdateProductResponse {
  message: string;
  fields?: string[];
}
export interface UploadedFile {
  file_id: Uuid;
  url: string;
  mime_type: string;
  original_filename: string;
  width?: number;
  height?: number;
}
export interface UploadMediaResponse {
  uploadedFiles: UploadedFile[];
  message: string;
}

// ---------------------------------------------------------------- billing
export interface AddSubscriptionRequest {
  from_date: IsoDate;
  to_date: IsoDate;
  payment_status: PaymentStatus;
  transaction_id: string;
}
export interface AddSubscriptionResponse {
  message: string;
  subscription: Subscription;
}
export interface ExtendSubscriptionRequest {
  additional_days: number;
  payment_status: PaymentStatus;
  transaction_id: string;
}
export interface ExtendSubscriptionResponse {
  message: string;
  new_end_date?: IsoDate;
  new_subscription?: Subscription;
}
export interface Identifier {
  id: string | number;
  identifier: string;
  price: string;
  created_at?: IsoDate;
  updated_at?: IsoDate;
  deleted_at?: IsoDate | null;
}
export interface IdentifiersResponse {
  identifiers: Identifier[];
}
export interface HealthResponse {
  status: "ok";
}
