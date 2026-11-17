// Retail barcode validation: EAN-8, UPC-A (12), EAN-13, with the GS1 check
// digit. A wrong check digit is caught here, before the API is asked (an
// unknown barcode can cost an Open Food Facts call and an AI lookup).

export type BarcodeKind = "EAN-8" | "UPC-A" | "EAN-13";

export type BarcodeResult =
  | { ok: true; code: string; kind: BarcodeKind }
  | {
      ok: false;
      code: string;
      reason: "empty" | "characters" | "length" | "check-digit";
      message: string;
      expected?: number;
    };

const KINDS: Record<number, BarcodeKind> = { 8: "EAN-8", 12: "UPC-A", 13: "EAN-13" };

/** GS1 check digit for the digits before the check digit. */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  // weights 3,1,3,1... from the rightmost body digit
  for (let i = body.length - 1, weight = 3; i >= 0; i -= 1, weight = weight === 3 ? 1 : 3) {
    sum += Number(body[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

export function validateBarcode(input: string): BarcodeResult {
  const code = input.replace(/[\s-]/g, "");
  if (!code) return { ok: false, code, reason: "empty", message: "Enter a barcode." };
  if (!/^\d+$/.test(code)) {
    return { ok: false, code, reason: "characters", message: "A barcode contains digits only (no letters)." };
  }
  const kind = KINDS[code.length];
  if (!kind) {
    return {
      ok: false,
      code,
      reason: "length",
      message: `A barcode has 8 (EAN-8), 12 (UPC-A) or 13 (EAN-13) digits; this one has ${code.length}.`,
    };
  }
  const expected = gs1CheckDigit(code.slice(0, -1));
  if (Number(code.slice(-1)) !== expected) {
    return {
      ok: false,
      code,
      reason: "check-digit",
      expected,
      message: `The last digit (check digit) should be ${expected} for this ${kind}. Please check the number.`,
    };
  }
  return { ok: true, code, kind };
}
