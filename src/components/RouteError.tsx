import { Component, type ReactNode } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

/** Route-level error screen (react-router errorElement): never a white screen, never a stack trace. */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="card narrow" role="alert" data-testid="route-error">
      <h1>{notFound ? "Page not found" : "This page hit a problem"}</h1>
      <p>
        {notFound
          ? "There is no page at this address."
          : "Something unexpected went wrong while showing this page. Your data is safe; try reloading."}
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </button>
        <Link className="button" to="/lookup">
          Go to barcode lookup
        </Link>
      </div>
    </section>
  );
}

/** Last-resort boundary around the whole app (errors outside the router). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="main">
        <section className="card narrow" role="alert" data-testid="app-error">
          <h1>The app hit a problem</h1>
          <p>Please reload the page.</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload
          </button>
        </section>
      </main>
    );
  }
}
