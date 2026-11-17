// Country names in English from Open Food Facts tags ("en:united-kingdom"),
// falling back to the free-text field (often in the product's own language).

const SPECIAL: Record<string, string> = {
  "united-states": "United States",
  "united-kingdom": "United Kingdom",
  "united-arab-emirates": "United Arab Emirates",
  "cote-d-ivoire": "Côte d'Ivoire",
  "south-korea": "South Korea",
  "new-zealand": "New Zealand",
  "saudi-arabia": "Saudi Arabia",
  "south-africa": "South Africa",
  "czech-republic": "Czech Republic",
};

export function countryFromTag(tag: string): string {
  const slug = tag.replace(/^[a-z]{2,3}:/, "").toLowerCase();
  const special = SPECIAL[slug];
  if (special) return special;
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word : (word[0] ?? "").toUpperCase() + word.slice(1)))
    .join(" ");
}

export function countryNames(tags: unknown, fallback: string | null | undefined): string[] {
  if (Array.isArray(tags)) {
    const names = tags
      .filter((t): t is string => typeof t === "string" && t.trim() !== "")
      .map(countryFromTag);
    if (names.length) return [...new Set(names)];
  }
  return (fallback ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
