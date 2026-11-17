-- Row counts compared before and after the backend restart (read-only).
SELECT json_build_object(
  'products',              (SELECT count(*) FROM products),
  'productdetails',        (SELECT count(*) FROM productdetails),
  'mediafiles',            (SELECT count(*) FROM mediafiles),
  'users',                 (SELECT count(*) FROM users),
  'subscriptions',         (SELECT count(*) FROM subscriptions),
  'producthistories',      (SELECT count(*) FROM producthistories),
  'product_lookup_misses', (SELECT count(*) FROM product_lookup_misses)
);
