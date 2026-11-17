import { Link, useLocation } from "react-router-dom";
import { usePageTitle } from "../components/states";

export function NotFoundPage() {
  usePageTitle("Page not found");
  const location = useLocation();
  return (
    <section className="card narrow" data-testid="not-found-page">
      <h1>Page not found</h1>
      <p>
        There is no page at <code>{location.pathname}</code>.
      </p>
      <div className="actions">
        <Link className="button primary-link" to="/lookup">
          Barcode lookup
        </Link>
        <Link className="button" to="/search">
          Browse products
        </Link>
        <Link className="button" to="/explorer">
          API Explorer
        </Link>
      </div>
    </section>
  );
}
