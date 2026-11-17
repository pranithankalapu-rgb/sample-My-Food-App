-- Ground truth for one e2e phase, read from the live database (read-only):
-- 10 random products, the number of listed products and every uploaded
-- image file name. The listing condition mirrors LISTABLE_SQL in the API.
SELECT json_build_object(
  'products', (
    SELECT json_agg(t) FROM (
      SELECT d.code, d.product_name, d.product_name_en, d.brands, d.data_source, d.nutriments,
             EXISTS (
               SELECT 1 FROM products p
                WHERE p.code = d.code AND p.product_name IS NOT NULL
                  AND p.product_name ~ '[[:alnum:]]' AND p.deleted_at IS NULL
             ) AS listed
        FROM productdetails d
       WHERE d.deleted_at IS NULL
       ORDER BY random()
       LIMIT 10
    ) t
  ),
  'listableCount', (
    SELECT count(*) FROM products
     WHERE product_name IS NOT NULL AND product_name ~ '[[:alnum:]]' AND deleted_at IS NULL
  ),
  'uploadFiles', (
    SELECT coalesce(json_agg(DISTINCT f ORDER BY f), '[]'::json) FROM (
      SELECT jsonb_array_elements(
               CASE WHEN jsonb_typeof(selected_images->'uploaded_images') = 'array'
                    THEN selected_images->'uploaded_images' ELSE '[]'::jsonb END
             )->>'url' AS f
        FROM productdetails
       WHERE deleted_at IS NULL
    ) x WHERE f IS NOT NULL
  )
);
