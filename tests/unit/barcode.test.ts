import { describe, expect, it } from "vitest";
import { gs1CheckDigit, validateBarcode } from "../../src/lib/barcode";

describe("validateBarcode", () => {
  it.each([
    ["3017620422003", "EAN-13"],
    ["8715700407760", "EAN-13"],
    ["0037600105064", "EAN-13"],
    ["96385074", "EAN-8"],
    ["12345670", "EAN-8"],
    ["036000291452", "UPC-A"],
  ])("accepts %s as %s", (code, kind) => {
    expect(validateBarcode(code)).toEqual({ ok: true, code, kind });
  });

  it("ignores spaces and dashes", () => {
    expect(validateBarcode(" 3017 6204-22003 ")).toMatchObject({ ok: true, code: "3017620422003" });
  });

  it.each([
    ["", "empty"],
    ["abc123def", "characters"],
    ["30176204220O3", "characters"],
    ["1234", "length"],
    ["123456789", "length"],
    ["12345678901234", "length"],
    ["8715700407761", "check-digit"],
    ["3017620422004", "check-digit"],
    ["96385075", "check-digit"],
    ["036000291453", "check-digit"],
  ])("rejects %j (%s)", (code, reason) => {
    const result = validateBarcode(code);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it("tells the expected check digit", () => {
    const result = validateBarcode("8715700407761");
    expect(result).toMatchObject({ ok: false, expected: 0 });
    if (!result.ok) expect(result.message).toContain("should be 0");
  });

  it("computes GS1 check digits", () => {
    expect(gs1CheckDigit("301762042200")).toBe(3);
    expect(gs1CheckDigit("9638507")).toBe(4);
    expect(gs1CheckDigit("03600029145")).toBe(2);
  });
});
