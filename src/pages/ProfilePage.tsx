import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, type PaymentStatus, type UserDetails, type UserInfo } from "../api";
import { keys, useHistory, useIdentifiers, useUserDetails } from "../api/queries";
import { useSession } from "../auth/session";
import { useToast } from "../components/Toasts";
import { EmptyState, ErrorPanel, Skeleton, usePageTitle } from "../components/states";
import { formatDate } from "../lib/format";

const csv = (list: string[] | undefined): string => (list ?? []).join(", ");
const toList = (value: string): string[] =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function ProfilePage() {
  usePageTitle("Account & profile");
  const { session } = useSession();
  const id = session?.user.id;
  const user = useUserDetails(id);

  return (
    <div className="stack">
      <section className="card">
        <h1>Account &amp; profile</h1>
        {user.isPending && <Skeleton lines={4} />}
        {user.isError && (
          <ErrorPanel
            error={user.error}
            title="Could not load your account"
            onRetry={() => {
              void user.refetch();
            }}
            testId="profile-error"
          />
        )}
        {user.isSuccess && <Details user={user.data.data.user} />}
      </section>
      {user.isSuccess && <HealthProfile user={user.data.data.user} />}
      {id && <Quota id={id} />}
      {id && <History id={id} />}
      {user.isSuccess && <Subscriptions user={user.data.data.user} />}
      {id && <DangerZone id={id} />}
    </div>
  );
}

function Details({ user }: { user: UserDetails }) {
  return (
    <dl className="details" data-testid="profile-details">
      <dt>Name</dt>
      <dd>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}</dd>
      <dt>Email</dt>
      <dd data-testid="profile-email">{user.email}</dd>
      <dt>Role</dt>
      <dd>{user.role}</dd>
      <dt>Email verified</dt>
      <dd>
        {user.email_verification_status === "VERIFIED" ? (
          "Yes"
        ) : (
          <>
            No · <Link to="/login">verify it</Link>
          </>
        )}
      </dd>
      <dt>Scans used</dt>
      <dd data-testid="profile-scans">
        {user.user_scan_count ?? 0} of {user.total_scan_limit} free scans
      </dd>
      <dt>Subscription</dt>
      <dd>
        {user.active_subscription ? `Active until ${formatDate(user.active_subscription.to_date)}` : "None"}
      </dd>
    </dl>
  );
}

function HealthProfile({ user }: { user: UserDetails }) {
  const toast = useToast();
  const qc = useQueryClient();
  const info: UserInfo = user.user_info ?? {};
  const [conditions, setConditions] = useState(csv(info.health_conditions));
  const [allergies, setAllergies] = useState(csv(info.allergies));
  const m = useMutation({
    mutationFn: () =>
      api.user.update(user.id, {
        user_info: { health_conditions: toList(conditions), allergies: toList(allergies) },
      }),
    onSuccess: () => {
      toast.show({ kind: "success", message: "Health profile saved. Verdicts now use it." });
      void qc.invalidateQueries({ queryKey: keys.user(user.id) });
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
  return (
    <section className="card" aria-labelledby="health-title">
      <h2 id="health-title">Health profile</h2>
      <p className="muted small">
        Used by the API to score products for you (PUT /user/:id). Separate items with commas.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        aria-label="Health profile"
      >
        <label>
          Health conditions
          <input
            value={conditions}
            placeholder="e.g. diabetes, hypertension"
            onChange={(e) => {
              setConditions(e.target.value);
            }}
          />
        </label>
        <label>
          Allergies
          <input
            value={allergies}
            placeholder="e.g. peanuts, milk"
            onChange={(e) => {
              setAllergies(e.target.value);
            }}
          />
        </label>
        {m.isError && <ErrorPanel error={m.error} title="Could not save the profile" />}
        <button type="submit" className="primary" disabled={m.isPending}>
          {m.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}

function Quota({ id }: { id: string }) {
  const m = useMutation({ mutationFn: () => api.user.incrementScan(id) });
  return (
    <section className="card" aria-labelledby="quota-title">
      <h2 id="quota-title">Scan quota</h2>
      <p className="muted small">
        Lookups and label scans count on the server. This check (PUT /user/:id/increment-scan) only reports
        the quota.
      </p>
      <button
        type="button"
        onClick={() => {
          m.mutate();
        }}
        disabled={m.isPending}
      >
        Check my quota
      </button>
      {m.isSuccess && (
        <p data-testid="quota-info" role="status">
          {m.data.data.info.remaining_scans} of {m.data.data.info.total_scans} scans left (
          {m.data.data.info.scanned_count} used).
        </p>
      )}
      {m.isError && <ErrorPanel error={m.error} title="Quota" testId="quota-error" />}
    </section>
  );
}

function History({ id }: { id: string }) {
  const q = useHistory(id);
  const rows = q.data?.data.productHistory ?? [];
  return (
    <section className="card" aria-labelledby="history-title">
      <h2 id="history-title">Scan history</h2>
      {q.isPending && <Skeleton lines={3} />}
      {q.isError && (
        <ErrorPanel
          error={q.error}
          title="Could not load your history"
          onRetry={() => {
            void q.refetch();
          }}
        />
      )}
      {q.isSuccess && rows.length === 0 && (
        <EmptyState title="No scans yet" testId="history-empty">
          <p>
            <Link to="/lookup">Look up a barcode</Link> and it will appear here.
          </p>
        </EmptyState>
      )}
      {rows.length > 0 && (
        <table className="table" data-testid="history-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Barcode</th>
              <th scope="col">Last scanned</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={`${h.product_code}-${h.updated_at}`}>
                <td>
                  <Link to={`/product/${h.product_code}`}>{h.product_name || "—"}</Link>
                </td>
                <td>
                  <code>{h.product_code}</code>
                </td>
                <td>{formatDate(h.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Subscriptions({ user }: { user: UserDetails }) {
  const toast = useToast();
  const qc = useQueryClient();
  const tiers = useIdentifiers();
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [txn, setTxn] = useState(() => `web-${Date.now()}`);
  const refresh = () => {
    setTxn(`web-${Date.now()}`);
    void qc.invalidateQueries({ queryKey: keys.user(user.id) });
  };
  const add = useMutation({
    mutationFn: () => {
      const from = new Date();
      const to = new Date(from.getTime() + days * 86_400_000);
      return api.billing.add({
        from_date: from.toISOString(),
        to_date: to.toISOString(),
        payment_status: status,
        transaction_id: txn,
      });
    },
    onSuccess: (res) => {
      toast.show({ kind: "success", message: res.data.message });
      refresh();
    },
  });
  const extend = useMutation({
    mutationFn: () =>
      api.billing.extend({ additional_days: days, payment_status: status, transaction_id: txn }),
    onSuccess: (res) => {
      toast.show({ kind: "success", message: res.data.message });
      refresh();
    },
  });
  return (
    <section className="card" aria-labelledby="subs-title">
      <h2 id="subs-title">Subscriptions</h2>
      <h3>Plans (GET /identifiers)</h3>
      {tiers.isPending && <Skeleton lines={2} />}
      {tiers.isError && (
        <ErrorPanel
          error={tiers.error}
          title="Could not load plans"
          onRetry={() => {
            void tiers.refetch();
          }}
        />
      )}
      {tiers.isSuccess && (
        <ul className="link-list" data-testid="plans">
          {tiers.data.data.identifiers.map((t) => (
            <li key={t.id}>
              <code>{t.identifier}</code> · {t.price}
            </li>
          ))}
        </ul>
      )}
      <h3>Your records</h3>
      {user.subscription_details.length === 0 ? (
        <p className="muted">No subscription records.</p>
      ) : (
        <table className="table" data-testid="subscriptions-table">
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Status</th>
              <th scope="col">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {user.subscription_details.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.from_date)}</td>
                <td>{formatDate(s.to_date)}</td>
                <td>{s.payment_status}</td>
                <td>
                  <code>{s.transaction_id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>Record a purchase (testing)</h3>
      <p className="muted small">
        The app normally sends these after a store purchase. While the API runs in "client" billing mode it
        trusts the payment status sent here.
      </p>
      <form
        className="row3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        aria-label="Subscription"
      >
        <label>
          Days
          <input
            type="number"
            min={1}
            max={400}
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
            }}
          />
        </label>
        <label>
          Payment status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus);
            }}
          >
            <option value="pending">pending</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <label>
          Transaction id
          <input
            value={txn}
            maxLength={255}
            onChange={(e) => {
              setTxn(e.target.value);
            }}
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={add.isPending}>
            Add subscription
          </button>
          <button
            type="button"
            disabled={extend.isPending}
            onClick={() => {
              extend.mutate();
            }}
          >
            Extend
          </button>
        </div>
      </form>
      {add.isError && (
        <ErrorPanel error={add.error} title="Could not add the subscription" testId="subscription-error" />
      )}
      {extend.isError && (
        <ErrorPanel error={extend.error} title="Could not extend the subscription" testId="extend-error" />
      )}
    </section>
  );
}

function DangerZone({ id }: { id: string }) {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const logoutAll = useMutation({
    mutationFn: () => api.admin.logout(),
    onSuccess: () => {
      signOut("Every session of this account has ended.");
      void navigate("/login");
    },
  });
  const remove = useMutation({
    mutationFn: () => api.user.remove(id),
    onSuccess: () => {
      signOut("Your account was deleted.");
      void navigate("/login");
    },
  });
  return (
    <section className="card danger" aria-labelledby="danger-title">
      <h2 id="danger-title">Sessions and account</h2>
      <button
        type="button"
        onClick={() => {
          logoutAll.mutate();
        }}
        disabled={logoutAll.isPending}
        data-testid="logout-everywhere"
      >
        Log out on every device
      </button>
      {logoutAll.isError && <ErrorPanel error={logoutAll.error} title="Could not end the sessions" />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          remove.mutate();
        }}
        aria-label="Delete account"
      >
        <label>
          Type your email to delete the account (personal data is erased and cannot be restored)
          <input
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
            }}
            autoComplete="off"
          />
        </label>
        {remove.isError && <ErrorPanel error={remove.error} title="Could not delete the account" />}
        <button
          type="submit"
          className="danger-button"
          disabled={confirm !== session?.user.email || remove.isPending}
        >
          Delete my account
        </button>
      </form>
    </section>
  );
}
