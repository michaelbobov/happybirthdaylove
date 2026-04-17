import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM envelope encryption.
 * Ciphertext layout: [12-byte IV][16-byte auth tag][ciphertext...]
 * Stored as a single bytea blob in Postgres.
 *
 * Key source: ENVELOPE_ENC_KEY env var, base64-encoded 32 bytes.
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ALG = "aes-256-gcm" as const;
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const b64 = process.env.ENVELOPE_ENC_KEY;
  if (!b64) throw new Error("ENVELOPE_ENC_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("ENVELOPE_ENC_KEY must decode to 32 bytes");
  cachedKey = key;
  return key;
}

export function encrypt(plaintext: string | Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const buf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const ct = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decrypt(blob: Buffer): Buffer {
  if (blob.length < IV_LEN + TAG_LEN) throw new Error("ciphertext too short");
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

export function decryptToString(blob: Buffer): string {
  return decrypt(blob).toString("utf8");
}

/** Convert a Postgres bytea response (`\x...` hex or base64 string or Buffer) into a Buffer. */
export function coerceBytea(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return Buffer.from(v.slice(2), "hex");
    // supabase returns base64 for bytea over PostgREST
    return Buffer.from(v, "base64");
  }
  throw new Error("Unrecognized bytea value");
}

/** 32-byte URL-safe token for bundle share links. */
export function newAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
