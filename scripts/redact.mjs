// Redaction shared by merge-results.mjs (and usable on old result files):
//   node scripts/redact.mjs <file.json> [...]
// Passwords, tokens and emailed codes never stay in committed evidence.
import fs from "node:fs";

const SECRET_KEYS = new Set(["password", "repassword", "new_password", "token", "social_token"]);
const TOKEN_IN_TEXT =
  /("(?:password|repassword|new_password|token|social_token)\\?"\s*:\s*\\?")[^"\\]*(\\?")/g;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        typeof v === "string" && (SECRET_KEYS.has(k) || (k === "code" && "email" in value))
          ? "<redacted>"
          : redact(v),
      ]),
    );
  }
  // bodies that were trimmed to a string still carry JSON text
  if (typeof value === "string")
    return value.replace(TOKEN_IN_TEXT, "$1<redacted>$2").replace(JWT, "<redacted-jwt>");
  return value;
}

if (process.argv[1]?.endsWith("redact.mjs")) {
  for (const file of process.argv.slice(2)) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.writeFileSync(file, JSON.stringify(redact(data), null, 2));
    console.log(`redacted ${file}`);
  }
}
