// Ingredient text with highlighted allergens, built as plain data (never HTML
// strings) so nothing from the API is ever injected into the page.

export interface TextSegment {
  text: string;
  allergen: boolean;
}

/** "en:milk" -> "milk", "en:gluten" -> "gluten" */
export function tagName(tag: string): string {
  return tag
    .replace(/^[a-z]{2,3}:/, "")
    .replace(/-/g, " ")
    .trim();
}

// words that name an allergen in common ingredient lists (EU 14 + synonyms)
const SYNONYMS: Record<string, string[]> = {
  gluten: ["wheat", "barley", "rye", "oats", "oat", "spelt", "gluten", "semolina", "malt"],
  milk: ["milk", "lactose", "butter", "cream", "whey", "cheese", "yoghurt", "yogurt", "casein", "lait"],
  eggs: ["egg", "eggs", "albumen"],
  nuts: [
    "almond",
    "almonds",
    "hazelnut",
    "hazelnuts",
    "walnut",
    "walnuts",
    "cashew",
    "cashews",
    "pecan",
    "pistachio",
    "nuts",
  ],
  peanuts: ["peanut", "peanuts", "groundnut"],
  soybeans: ["soy", "soya", "soybean", "soybeans"],
  fish: ["fish", "anchovy", "tuna", "salmon", "cod"],
  crustaceans: ["shrimp", "prawn", "prawns", "crab", "lobster", "crustaceans"],
  molluscs: ["mussel", "mussels", "oyster", "squid", "molluscs"],
  celery: ["celery", "celeriac"],
  mustard: ["mustard"],
  "sesame seeds": ["sesame"],
  "sulphur dioxide and sulphites": ["sulphite", "sulphites", "sulfite", "sulfites", "sulphur dioxide"],
  lupin: ["lupin", "lupine"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Open Food Facts marks allergens as <span class="allergen">x</span> in
 * ingredients_text_with_allergens; any other markup is dropped as text.
 */
export function segmentsFromMarkup(markup: string): TextSegment[] | null {
  if (!/<span class="allergen">/i.test(markup)) return null;
  const segments: TextSegment[] = [];
  const re = /<span class="allergen">(.*?)<\/span>/gi;
  let last = 0;
  for (const match of markup.matchAll(re)) {
    const index = match.index;
    if (index > last) segments.push({ text: stripTags(markup.slice(last, index)), allergen: false });
    segments.push({ text: stripTags(match[1] ?? ""), allergen: true });
    last = index + match[0].length;
  }
  if (last < markup.length) segments.push({ text: stripTags(markup.slice(last)), allergen: false });
  return segments.filter((s) => s.text);
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Highlights words of the given allergens (from allergens_tags) in plain text. */
export function segmentsFromTags(text: string, allergenTags: string[]): TextSegment[] {
  const words = new Set<string>();
  for (const tag of allergenTags) {
    const name = tagName(tag).toLowerCase();
    if (!name) continue;
    words.add(name);
    for (const synonym of SYNONYMS[name] ?? []) words.add(synonym);
  }
  if (!text || words.size === 0) return text ? [{ text, allergen: false }] : [];
  const pattern = [...words]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const re = new RegExp(`(?<![\\p{L}])(${pattern})(?![\\p{L}])`, "giu");
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), allergen: false });
    segments.push({ text: match[0], allergen: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), allergen: false });
  return segments;
}

export function ingredientSegments(input: {
  ingredients_text?: string | null;
  ingredients_text_with_allergens?: string | null;
  allergens_tags?: string[] | null;
  allergens_hierarchy?: string[] | null;
}): TextSegment[] {
  const text = (input.ingredients_text ?? "").trim();
  const markup = (input.ingredients_text_with_allergens ?? "").trim();
  // the markup is only trusted when it describes the same text that is shown
  if (markup && stripTags(markup).trim() === text) {
    const fromMarkup = segmentsFromMarkup(markup);
    if (fromMarkup) return fromMarkup;
  }
  const tags = [...(input.allergens_tags ?? []), ...(input.allergens_hierarchy ?? [])];
  return segmentsFromTags(text, [...new Set(tags)]);
}
