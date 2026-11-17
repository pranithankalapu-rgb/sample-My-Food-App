import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useProduct } from "../api/queries";
import { isApiError, type Product } from "../api";
import { Gallery } from "../components/Gallery";
import { NutritionTable, SourceBadges, VerdictDetails } from "../components/productBits";
import { ErrorPanel, Skeleton, usePageTitle } from "../components/states";
import { galleryImages } from "../lib/images";
import { ingredientSegments, tagName } from "../lib/allergens";
import { countryNames } from "../lib/countries";

export function ProductPage() {
  const { code = "" } = useParams();
  const q = useProduct(code);
  const queryClient = useQueryClient();
  usePageTitle(q.data?.data.product.product_name || `Product ${code}`);

  // a lookup is a scan: the history and the quota on other screens changed
  const lookedUpAt = q.isSuccess ? q.dataUpdatedAt : 0;
  useEffect(() => {
    if (!lookedUpAt) return;
    void queryClient.invalidateQueries({ queryKey: ["history"] });
    void queryClient.invalidateQueries({ queryKey: ["user"] });
  }, [lookedUpAt, queryClient]);

  if (q.isPending) {
    return (
      <section className="card" data-testid="product-loading">
        <h1>Looking up {code}</h1>
        <p className="muted">
          Known products come from our database. Unknown barcodes are checked with Open Food Facts and then
          the AI fallback, which can take up to half a minute.
        </p>
        <Skeleton lines={8} label={`Looking up ${code}`} />
      </section>
    );
  }
  if (q.isError) {
    const err = q.error;
    if (isApiError(err) && err.status === 404) {
      const pending = (err.body as { lookup_pending?: boolean } | null)?.lookup_pending === true;
      return (
        <section className="card narrow" data-testid={pending ? "product-pending" : "product-not-found"}>
          <h1>{pending ? "Still looking it up" : "Product not found"}</h1>
          <p role={pending ? "status" : "alert"}>
            {pending
              ? `The AI fallback is still searching for ${code}. It keeps running on the server; try again in a minute.`
              : `No product with barcode ${code} was found in our database, on Open Food Facts or by the AI fallback.`}
          </p>
          <p className="muted small">API message: {err.serverMessage ?? "—"}</p>
          <div className="actions">
            {pending && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  void q.refetch();
                }}
              >
                Try again
              </button>
            )}
            <Link className="button" to="/lookup">
              New lookup
            </Link>
          </div>
        </section>
      );
    }
    return (
      <section className="card narrow">
        <h1>Lookup failed</h1>
        <ErrorPanel
          error={err}
          title={`Could not look up ${code}`}
          onRetry={() => {
            void q.refetch();
          }}
          testId="product-error"
        />
        <Link className="button" to="/lookup">
          New lookup
        </Link>
      </section>
    );
  }
  return <ProductDetail product={q.data.data.product} fetchedAt={q.dataUpdatedAt} />;
}

function ProductDetail({ product, fetchedAt }: { product: Product; fetchedAt: number }) {
  const name = product.product_name || product.product_name_en || "Unnamed product";
  const images = galleryImages(product);
  const segments = ingredientSegments(product);
  const allergens = [...new Set([...(product.allergens_tags ?? []), ...product.allergens_hierarchy])].map(
    tagName,
  );
  const traces = (product.traces_tags ?? []).map(tagName);
  const countries = countryNames(product.countries_tags, product.countries);
  const per =
    product.nutrition_data_per === "serving"
      ? "per serving"
      : product.nutrition_data_per === "100ml"
        ? "per 100 ml"
        : "per 100 g";
  const grade = typeof product.nutriscore_grade === "string" ? product.nutriscore_grade : "";

  return (
    <article className="card product" data-testid="product-detail" data-code={product.code}>
      <header className="product-head">
        <h1 data-testid="product-name">{name}</h1>
        <p className="brand-line" data-testid="product-brand">
          {product.brands || "Brand unknown"}
        </p>
        <p className="muted">
          Barcode <code data-testid="product-code">{product.code}</code>
          {grade && (
            <>
              {" "}
              · Nutri-Score <strong className="upper">{grade}</strong>
            </>
          )}
        </p>
        <SourceBadges product={product} fetchedAt={fetchedAt} />
      </header>

      <div className="product-grid">
        <section aria-labelledby="images-title">
          <h2 id="images-title">Images</h2>
          <Gallery images={images} name={name} lowRes={product.needs_better_image} />
        </section>
        <section aria-labelledby="nutrition-title">
          <h2 id="nutrition-title">Nutrition</h2>
          <NutritionTable nutriments={product.nutriments} per={per} />
        </section>
      </div>

      <section aria-labelledby="ingredients-title">
        <h2 id="ingredients-title">Ingredients</h2>
        {segments.length ? (
          <p data-testid="product-ingredients" className="ingredients">
            {segments.map((s, i) =>
              s.allergen ? (
                <mark key={i} className="allergen" data-testid="allergen-highlight">
                  {s.text}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </p>
        ) : (
          <p className="muted" data-testid="product-ingredients-missing">
            No ingredient list.
          </p>
        )}
        <p data-testid="product-allergens">
          <strong>Allergens:</strong>{" "}
          {allergens.length ? allergens.join(", ") : <span className="muted">none declared</span>}
          {traces.length > 0 && (
            <>
              {" "}
              · <strong>May contain:</strong> {traces.join(", ")}
            </>
          )}
        </p>
      </section>

      <section aria-labelledby="countries-title">
        <h2 id="countries-title">Countries</h2>
        <p data-testid="product-countries">
          {countries.length ? countries.join(", ") : <span className="muted">Not listed.</span>}
        </p>
      </section>

      <section aria-labelledby="verdict-title">
        <h2 id="verdict-title">For you</h2>
        <VerdictDetails value={product.isRecommended} testId="product-verdict" />
        <p className="muted small">
          Based on the health profile in your account. <Link to="/profile">Edit profile</Link>
        </p>
      </section>
      <Link className="button" to="/lookup">
        ← New lookup
      </Link>
    </article>
  );
}
