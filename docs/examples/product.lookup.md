# GET `/product/{code}`

Barcode scan: DB first, then Open Food Facts (stored), then fallbacks (stored). Counts a scan (free re-open within 10 min), writes history, scores against the user's profile.

## Example: returns a stored product with every documented field

`GET http://api:9595/product/8715700407760` → **HTTP 200** in 22 ms

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=120, remaining=119, reset=60
ratelimit-policy: 120;w=60
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
{"product":{"id":"4375","code":"8715700407760","_keywords":["ab","agriculture","aliment","base","bio","biologique","boisson","condiment","de","derive","et","europeen","fruit","heinz","ketchup","legume","nl-bio-01","non","origine","sauce","tomate","tomato","triman","ue","ue-non","vegetale","vegetaux"],"additives_tags":[],"allergens":"céleri","allergens_tags":["en:celery"],"traces":null,"traces_tags":[],"traces_hierarchy":[],"off_fetched_at":"2026-11-16T12:57:01.750Z","allergens_edited_at":null,"allergens_from_ingredients":"","allergens_hierarchy":["en:celery"],"amino_acids_tags":[],"brands":"Heinz","categories":"Ketchup","categories_tags":["en:plant-based-foods-and-beverages","en:plant-based-foods","en:fruits-and-vegetables-based-foods","en:vegetable-based-foods-and-beverages","en:condiments","en:vegetables-based-foods","en:tomatoes-and-their-products","en:sauces","en:tomato-sauces","en:ketchup"],"countries":"Belgique, France, Allemagne, Grèce, Roumanie, Espagne, Suisse, Royaume-Uni, États-Unis","food_groups":"en:dressings-and-sauces","food_groups_tags":["en:fats-and-sauces","en:dressings-and-sauces"],"generic_name":"","generic_name_en":"","ingredients":[{"id":"en:tomato","text":"Tomates","vegan":"yes","labels":"en:organic","vegetarian":"yes","ingredients":[],"ecobalyse_id":"a96c560e-7959-4698-b533-23f922bb62b9","ecobalyse_name":"Tomate sous serre chauffée par défaut","is_in_taxonomy":1,"ciqual_food_code":"20047","percent_estimate":61.7,"quantity_estimate":61.7},{"id":"en:sugar","text":"sucre","vegan":"maybe","labels":"en:organic","vegetarian":"yes","ecobalyse_id":"5fc8032f-ca1c-4497-844b-f9213075eab3","ecobalyse_name":"Sucre de betterave par défaut -2025-","is_in_taxonomy":1,"ciqual_food_code":"31016","percent_estimate":23.37,"quantity_estimate":23.37,"ciqual_proxy_food_code":"31016"},{"id":"en:alcohol-vinegar","text":"vinaigre d'alcool","vegan":"yes","labels":"en:organic","vegetarian":"yes","ecobalyse_id":"24222e45-52dc-4c18-ab9f-0ee39d8a46b4","ecobalyse_name":"Vinaigre d'alcool FR -2025-","is_in_taxonomy":1,"ciqual_food_code":"11018","percent_estimate":14.04,"quantity_estimate":14.04},{"id":"en:salt","text":"sel","vegan":"yes","vegetarian":"yes","ecobalyse_id":"77defb24-cec3-4de9-8388-63229d1052fb","ecobalyse_name":"Sel -2025-","is_in_taxonomy":1,"ciqual_food_code":"11058","percent_estimate":1.7,"quantity_estimate":1.7},{"id":"en:spice","text":"épices","vegan":"yes","labels":"en:organic","vegetarian":"yes","ingredients":[{"id":"fr:contiennent du céleri","text":"contiennent du céleri","is_in_taxonomy":0,"percent_estimate":0,"quantity_estimate":0}],"is_in_taxonomy":1,"ciqual_food_code":"11081","percent_estimate":0,"quantity_estimate":0},{"id":"en:onion-powder","text":"poudre d'oignon","vegan":"yes","labels":"en:organic","vegetarian":"yes","ecobalyse_id":"23d64366-18f7-5f10-a3a8-6c15176d16a9","ecobalyse_name":"Oignons HORS UE","is_in_taxonomy":1,"ciqual_food_code":"20034","percent_estimate":0,"quantity_estimate":0},{"id":"en:garlic-powder","text":"poudre d'ail","vegan":"yes","labels":"en:organic","vegetarian":"yes","ecobalyse_id":"d8c8a918-a11a-502f-a5cf-90052d96c133","ecobalyse_name":"Ail Origine Inconnue","is_in_taxonomy":1,"ciqual_food_code":"11023","percent_estimate":0,"quantity_estimate":0}],"ingredients_analysis":{"en:vegan-status-unknown":["fr:contiennent du céleri"],"en:vegetarian-status-unknown":["fr:contiennent du céleri"]},"ingredients_analysis_tags":["en:palm-oil-free","en:vegan-status-unknown","en:vegetarian-status-unknown"],"ingredients_debug":["Tomates","(","(","180 g pour 100 g de Ketchup)*",",","sucrei*",",","vinaigre*",",","sel",",","épices*","(","(","contiennent du _céleri_)",",","poudre d'oignon",",","poudre d'ail*","-","-","-","* Issus de l'agriculture biologique."],"ingredients_from_or_that_may_be_from_palm_oil_n":0,"ingredients_from_palm_oil_n":0,"ingredients_from_palm_oil_tags":[],"ingredients_hierarchy":["en:tomato","en:fruit-vegetable","en:vegetable","en:sugar","en:disaccharide","en:added-sugar","en:al
```

## Failing case: 3. OpenAI last: a barcode nobody knows goes to the AI and ends in a clear 404 (or an AI-labelled product)

`GET http://api-t:9595/product/2049196314421` → **HTTP 503** in 546 ms

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=120, remaining=113, reset=13
ratelimit-policy: 120;w=60
retry-after: 30
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
{
  "message": "Product data is temporarily unavailable. Please try again.",
  "status": 503
}
```

Failure:

```text
expected 503 to be 404 // Object.is equality
```
