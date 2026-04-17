import "server-only";
import { hash, verify } from "@node-rs/argon2";

export type BundleLockContext = {
  accessToken: string;
  passphraseHash: string | null;
};

export type EnvelopeLockContext = {
  unlockType: "immediate" | "date" | "passphrase" | "manual";
  unlockAt: Date | null;
};

export type UnlockRequest = {
  token: string;
  passphrase?: string;
};

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "bad_token" | "locked_until" | "bad_passphrase" | "manual_locked"; unlockAt?: Date };

/**
 * Sole gate between a reveal request and the decrypted item payload.
 * Every reveal path must call this before touching encrypted data.
 */
export async function canUnlock(
  bundle: BundleLockContext,
  envelope: EnvelopeLockContext,
  req: UnlockRequest,
): Promise<UnlockResult> {
  if (req.token !== bundle.accessToken) {
    return { ok: false, reason: "bad_token" };
  }

  if (bundle.passphraseHash) {
    if (!req.passphrase) return { ok: false, reason: "bad_passphrase" };
    const ok = await verify(bundle.passphraseHash, req.passphrase);
    if (!ok) return { ok: false, reason: "bad_passphrase" };
  }

  switch (envelope.unlockType) {
    case "immediate":
      return { ok: true };
    case "date": {
      if (!envelope.unlockAt) return { ok: true };
      if (envelope.unlockAt.getTime() > Date.now()) {
        return { ok: false, reason: "locked_until", unlockAt: envelope.unlockAt };
      }
      return { ok: true };
    }
    case "passphrase":
      // bundle-level passphrase already verified above; this unlock_type implies no date gate.
      return { ok: true };
    case "manual":
      return { ok: false, reason: "manual_locked" };
  }
}

export async function hashPassphrase(pass: string): Promise<string> {
  return hash(pass, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}
