import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type QueueResponse, type UploadedFile } from "../api";
import { keys, useImageQueue, useProductList, useReviewQueue, useUsers } from "../api/queries";
import { useSession } from "../auth/session";
import { ProductImage } from "../components/ProductImage";
import { Pagination } from "../components/common";
import { useToast } from "../components/Toasts";
import { EmptyState, ErrorPanel, Skeleton, usePageTitle } from "../components/states";
import { formatDate } from "../lib/format";
import { sourceLabel } from "../components/productBits";

type Tab = "products" | "review" | "images" | "users" | "media";
const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "review", label: "Needs review" },
  { id: "images", label: "Needs better image" },
  { id: "users", label: "Users" },
  { id: "media", label: "Media" },
];

export default function AdminPage() {
  usePageTitle("Admin");
  const [tab, setTab] = useState<Tab>("products");
  return (
    <section className="card">
      <h1>Admin</h1>
      <div className="tabs wrap" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "products" && <Products />}
      {tab === "review" && <ReviewQueue />}
      {tab === "images" && <ImageQueue />}
      {tab === "users" && <Users />}
      {tab === "media" && <Media />}
    </section>
  );
}

function Products() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const q = useProductList(page, 20);
  if (editing)
    return (
      <EditProduct
        code={editing}
        onDone={() => {
          setEditing(null);
        }}
      />
    );
  if (q.isPending) return <Skeleton lines={6} />;
  if (q.isError)
    return (
      <ErrorPanel
        error={q.error}
        title="Could not load products"
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  const { data, pageInfo } = q.data.data;
  return (
    <>
      <p className="muted">{pageInfo.total} listed products (GET /product).</p>
      <table className="table" data-testid="admin-products">
        <thead>
          <tr>
            <th scope="col">Image</th>
            <th scope="col">Name</th>
            <th scope="col">Barcode</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.code} data-code={p.code}>
              <td className="cell-thumb">
                <ProductImage
                  src={p.image_thumb_url ?? p.image_url}
                  alt=""
                  size="thumb"
                  testId="admin-thumb"
                />
              </td>
              <td>
                <Link to={`/product/${p.code}`}>{p.product_name}</Link>
              </td>
              <td>
                <code>{p.code}</code>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(p.code);
                  }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pages={pageInfo.pages} onPage={setPage} />
    </>
  );
}

function EditProduct({ code, onDone }: { code: string; onDone: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  // admins are not counted as scans and get no history
  const q = useQuery({
    queryKey: ["admin-product", code],
    queryFn: ({ signal }) => api.product.lookup(code, { signal }),
  });
  const [form, setForm] = useState<{ product_name: string; brands: string; ingredients_text: string } | null>(
    null,
  );
  const product = q.data?.data.product;
  const values =
    form ??
    (product
      ? {
          product_name: product.product_name,
          brands: product.brands,
          ingredients_text: product.ingredients_text,
        }
      : null);

  const save = useMutation({
    mutationFn: (markVerified: boolean) =>
      api.admin.updateProduct({
        product_code: code,
        product_details: values ?? {},
        expected_updated_at: product?.updatedAt,
        ...(markVerified ? { mark_verified: true } : {}),
      }),
    onSuccess: (res) => {
      toast.show({ kind: "success", message: res.data.message });
      void qc.invalidateQueries();
      onDone();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteProduct(code),
    onSuccess: (res) => {
      toast.show({ kind: "success", message: `${res.data.message}. Scans of ${code} still work.` });
      void qc.invalidateQueries();
      onDone();
    },
  });

  if (q.isPending) return <Skeleton lines={5} />;
  if (q.isError)
    return (
      <ErrorPanel
        error={q.error}
        title={`Could not load ${code}`}
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  if (!values || !product) return null;
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => {
    setForm({ ...values, [key]: e.target.value });
  };
  return (
    <div className="stack" data-testid="admin-edit">
      <h2>Edit {code}</h2>
      <p className="muted small">
        Source: {sourceLabel(product)} · last saved {formatDate(product.updatedAt)}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(false);
        }}
        aria-label="Edit product"
      >
        <label>
          Product name
          <input required maxLength={500} value={values.product_name} onChange={set("product_name")} />
        </label>
        <label>
          Brands
          <input value={values.brands} onChange={set("brands")} />
        </label>
        <label>
          Ingredients
          <textarea rows={4} value={values.ingredients_text} onChange={set("ingredients_text")} />
        </label>
        {save.isError && <ErrorPanel error={save.error} title="Could not save" testId="admin-save-error" />}
        {remove.isError && <ErrorPanel error={remove.error} title="Could not remove" />}
        <div className="actions">
          <button type="submit" className="primary" disabled={save.isPending}>
            Save
          </button>
          {product.data_source !== "openfoodfacts" && (
            <button
              type="button"
              onClick={() => {
                save.mutate(true);
              }}
              disabled={save.isPending}
            >
              Save and mark verified
            </button>
          )}
          <button
            type="button"
            className="danger-button"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Remove ${code} from listings and search? Scans still work.`))
                remove.mutate();
            }}
          >
            Remove from listing
          </button>
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function QueueTable({
  data,
  testId,
  showSize,
}: {
  data: QueueResponse["data"];
  testId: string;
  showSize?: boolean;
}) {
  return (
    <table className="table" data-testid={testId}>
      <thead>
        <tr>
          <th scope="col">Image</th>
          <th scope="col">Product</th>
          <th scope="col">Source</th>
          <th scope="col">{showSize ? "Image size" : "Added"}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.code}>
            <td className="cell-thumb">
              <ProductImage
                src={p.image_thumb_url ?? p.image_url}
                alt=""
                size="thumb"
                width={p.image_width}
                height={p.image_height}
                testId="queue-thumb"
              />
            </td>
            <td>
              <Link to={`/product/${p.code}`}>{p.product_name || p.code}</Link>
              <br />
              <span className="muted small">{p.brands}</span>
            </td>
            <td>{sourceLabel({ data_source: p.data_source ?? null, source_info: p.source_info ?? null })}</td>
            <td>
              {showSize
                ? p.image_width && p.image_height
                  ? `${p.image_width}×${p.image_height}`
                  : "no image"
                : formatDate(p.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReviewQueue() {
  const [page, setPage] = useState(1);
  const q = useReviewQueue(page);
  if (q.isPending) return <Skeleton lines={4} />;
  if (q.isError)
    return (
      <ErrorPanel
        error={q.error}
        title="Could not load the review queue"
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  const { data, pageInfo } = q.data.data;
  if (data.length === 0) {
    return (
      <EmptyState title="Nothing to review" testId="review-empty">
        <p>Products filled in by USDA or the AI lookup appear here until an admin confirms them.</p>
      </EmptyState>
    );
  }
  return (
    <>
      <p className="muted">
        {pageInfo.total} products from fallback sources need a check. Open one and use “Save and mark
        verified”.
      </p>
      <QueueTable data={data} testId="review-table" />
      <Pagination page={page} pages={pageInfo.pages} onPage={setPage} />
    </>
  );
}

function ImageQueue() {
  const [page, setPage] = useState(1);
  const q = useImageQueue(page);
  if (q.isPending) return <Skeleton lines={4} />;
  if (q.isError)
    return (
      <ErrorPanel
        error={q.error}
        title="Could not load the image queue"
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  const { data, pageInfo } = q.data.data;
  if (data.length === 0) return <EmptyState title="Every product has a good image" testId="images-empty" />;
  return (
    <>
      <p className="muted">{pageInfo.total} products need a sharper image (smallest first).</p>
      <QueueTable data={data} testId="image-queue-table" showSize />
      <Pagination page={page} pages={pageInfo.pages} onPage={setPage} />
    </>
  );
}

function Users() {
  const toast = useToast();
  const qc = useQueryClient();
  const { session } = useSession();
  const [page, setPage] = useState(1);
  const q = useUsers(page);
  const remove = useMutation({
    mutationFn: (id: string) => api.user.remove(id),
    onSuccess: () => {
      toast.show({ kind: "success", message: "User deleted (personal data erased)." });
      void qc.invalidateQueries({ queryKey: keys.users(page) });
    },
    onError: (err) => {
      toast.show({ kind: "error", message: err.message });
    },
  });
  if (q.isPending) return <Skeleton lines={5} />;
  if (q.isError)
    return (
      <ErrorPanel
        error={q.error}
        title="Could not load users"
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  const { data, pagination } = q.data.data;
  return (
    <>
      <p className="muted">{pagination.totalUsers} users (GET /users).</p>
      <table className="table" data-testid="admin-users">
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Verified</th>
            <th scope="col">Scans</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id} data-user={u.email}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.email_verification_status === "VERIFIED" ? "yes" : "no"}</td>
              <td>{u.user_scan_count ?? 0}</td>
              <td>
                {u.id !== session?.user.id && (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete ${u.email}? Personal data is erased.`)) remove.mutate(u.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pages={pagination.totalPages} onPage={setPage} />
    </>
  );
}

function Media() {
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const upload = useMutation({
    mutationFn: () => api.admin.uploadMedia({ images: files }),
    onSuccess: (res) => {
      setUploaded((list) => [...res.data.uploadedFiles, ...list]);
      setFiles([]);
      toast.show({ kind: "success", message: res.data.message });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.deleteMedia(id),
    onSuccess: (_res, id) => {
      setUploaded((list) => list.filter((f) => f.file_id !== id));
      toast.show({ kind: "success", message: "File deleted." });
    },
    onError: (err) => {
      toast.show({ kind: "error", message: err.message });
    },
  });
  return (
    <div className="stack">
      <p className="muted small">
        Upload product images (POST /media/upload). Files not used by a saved product are deleted by the API
        after 24 hours.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        aria-label="Upload media"
      >
        <label>
          Images (JPEG, PNG, WebP, GIF, HEIC; up to 10)
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            onChange={(e) => {
              setFiles([...(e.target.files ?? [])]);
            }}
          />
        </label>
        {upload.isError && <ErrorPanel error={upload.error} title="Upload failed" testId="media-error" />}
        <button type="submit" className="primary" disabled={files.length === 0 || upload.isPending}>
          {upload.isPending ? "Uploading…" : `Upload ${files.length || ""}`}
        </button>
      </form>
      {uploaded.length > 0 && (
        <table className="table" data-testid="media-table">
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Size</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {uploaded.map((f) => (
              <tr key={f.file_id}>
                <td>
                  {f.original_filename} <code className="small">{f.url}</code>
                </td>
                <td>{f.width && f.height ? `${f.width}×${f.height}` : "—"}</td>
                <td>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      remove.mutate(f.file_id);
                    }}
                    disabled={remove.isPending}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
