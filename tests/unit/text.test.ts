import { describe, expect, it } from "vitest";
import { ingredientSegments, segmentsFromMarkup, segmentsFromTags, tagName } from "../../src/lib/allergens";
import { countryFromTag, countryNames } from "../../src/lib/countries";
import { galleryImages, isLowResolution } from "../../src/lib/images";
import { formatNumber, percentile } from "../../src/lib/format";

describe("allergen highlighting", () => {
  it("names tags", () => {
    expect(tagName("en:milk")).toBe("milk");
    expect(tagName("en:sesame-seeds")).toBe("sesame seeds");
  });

  it("uses Open Food Facts allergen markup and drops other markup", () => {
    const segs = segmentsFromMarkup('Sugar, <span class="allergen">milk</span> powder, <b>salt</b>');
    expect(segs).toEqual([
      { text: "Sugar, ", allergen: false },
      { text: "milk", allergen: true },
      { text: " powder, salt", allergen: false },
    ]);
  });

  it("never returns raw HTML from markup", () => {
    const segs = segmentsFromMarkup('<span class="allergen">egg</span><img src=x onerror=alert(1)>') ?? [];
    expect(segs.map((s) => s.text).join("")).not.toContain("<");
  });

  it("highlights allergen words and synonyms from tags", () => {
    const segs = segmentsFromTags("Wheat flour, sugar, butter, emulsifier: lecithins (soya).", [
      "en:gluten",
      "en:milk",
      "en:soybeans",
    ]);
    expect(segs.filter((s) => s.allergen).map((s) => s.text.toLowerCase())).toEqual([
      "wheat",
      "butter",
      "soya",
    ]);
  });

  it("does not highlight inside other words", () => {
    const segs = segmentsFromTags("Buttermilk-free oatmeal", ["en:milk"]);
    expect(segs.some((s) => s.allergen && s.text === "milk")).toBe(false);
  });

  it("ignores markup that describes a different text", () => {
    const segs = ingredientSegments({
      ingredients_text: "Sugar, milk",
      ingredients_text_with_allergens: 'Zucker, <span class="allergen">Milch</span>',
      allergens_tags: ["en:milk"],
    });
    expect(segs.filter((s) => s.allergen).map((s) => s.text)).toEqual(["milk"]);
  });
});

describe("countries", () => {
  it("turns tags into English names", () => {
    expect(countryFromTag("en:united-kingdom")).toBe("United Kingdom");
    expect(countryFromTag("en:france")).toBe("France");
    expect(countryFromTag("en:cote-d-ivoire")).toBe("Côte d'Ivoire");
  });
  it("prefers tags and falls back to the text", () => {
    expect(countryNames(["en:france", "en:germany"], "Frankreich")).toEqual(["France", "Germany"]);
    expect(countryNames(null, "Belgique, France")).toEqual(["Belgique", "France"]);
    expect(countryNames([], "")).toEqual([]);
  });
});

describe("gallery", () => {
  it("puts the main image first and removes duplicates", () => {
    const url = "http://x/uploads/images/front.jpg";
    const images = galleryImages({
      image_url: url,
      image_thumb_url: url,
      image_width: 1200,
      image_height: 1200,
      selected_images: {
        front: { display: { en: url } },
        nutrition: { display: { fr: "http://x/n.jpg" }, thumb: { fr: "http://x/n-thumb.jpg" } },
      },
    });
    expect(images.map((i) => i.label)).toEqual(["Main image", "Nutrition facts"]);
    expect(images[1]?.thumbUrl).toBe("http://x/n-thumb.jpg");
  });
  it("handles products without images", () => {
    expect(
      galleryImages({
        image_url: null,
        image_thumb_url: null,
        image_width: null,
        image_height: null,
        selected_images: {},
      }),
    ).toEqual([]);
  });
  it("flags low resolution", () => {
    expect(isLowResolution(300, 900)).toBe(true);
    expect(isLowResolution(1200, 800)).toBe(false);
    expect(isLowResolution(null, null)).toBe(false);
  });
});

describe("format", () => {
  it("rounds and rejects non-numbers", () => {
    expect(formatNumber("0.6800")).toBe("0.68");
    expect(formatNumber(112)).toBe("112");
    expect(formatNumber("")).toBeNull();
    expect(formatNumber("abc")).toBeNull();
  });
  it("computes percentiles", () => {
    const v = [5, 1, 4, 2, 3, 10, 6, 7, 8, 9];
    expect(percentile(v, 50)).toBe(5);
    expect(percentile(v, 95)).toBe(10);
    expect(percentile([], 50)).toBeNull();
  });
});
