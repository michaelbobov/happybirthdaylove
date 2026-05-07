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

/**
 * Returns the ciphertext as a Postgres bytea literal (`\x<hex>`).
 * Passing a Node Buffer directly to supabase-js for a bytea column round-trips
 * through `Buffer.toJSON()` and lands as the literal text `{"type":"Buffer","data":[…]}`,
 * which corrupts the column. Always insert via this string form.
 */
export function encrypt(plaintext: string | Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const buf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const ct = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "\\x" + Buffer.concat([iv, tag, ct]).toString("hex");
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
  try {
    return decrypt(blob).toString("utf8");
  } catch (error) {
    const plaintext = blob.toString("utf8").trim();
    if (plaintext.startsWith("{") || plaintext.startsWith("[")) return plaintext;
    throw error;
  }
}

/** Convert a Postgres bytea response (`\x...` hex or base64 string or Buffer) into a Buffer. */
export function coerceBytea(v: unknown): Buffer {
  let buf: Buffer;
  if (Buffer.isBuffer(v)) buf = v;
  else if (v instanceof Uint8Array) buf = Buffer.from(v);
  else if (typeof v === "string") {
    buf = v.startsWith("\\x")
      ? Buffer.from(v.slice(2), "hex")
      : Buffer.from(v, "base64"); // supabase returns base64 for bytea over PostgREST
  } else {
    throw new Error("Unrecognized bytea value");
  }

  // Legacy rows: an earlier version of `encrypt()` returned a Node Buffer, and
  // supabase-js stringified it via Buffer.toJSON() before inserting, so the
  // bytea column literally contains `{"type":"Buffer","data":[…]}`. Recover the
  // original ciphertext bytes from that wrapper so old items still decrypt.
  if (buf.length > 20 && buf[0] === 0x7b /* '{' */) {
    const head = buf.subarray(0, 32).toString("utf8");
    if (head.startsWith('{"type":"Buffer"')) {
      try {
        const parsed = JSON.parse(buf.toString("utf8")) as { type?: string; data?: number[] };
        if (parsed?.type === "Buffer" && Array.isArray(parsed.data)) {
          return Buffer.from(parsed.data);
        }
      } catch {
        // fall through and return the raw buffer
      }
    }
  }
  return buf;
}

/** 32-byte URL-safe token for bundle share links. */
export function newAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
