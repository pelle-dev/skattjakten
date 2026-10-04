import { randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();

/** QR-token: 128 bitar slump, går inte att gissa. */
export const newQrToken = () => randomBytes(16).toString("base64url");

/** Hemlig nyckel för skattgömmare och deltagare. */
export const newSecret = () => randomBytes(24).toString("base64url");

// Inga tecken som är lätta att blanda ihop (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newCode(length = 6, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  for (;;) {
    const bytes = randomBytes(length);
    let code = "";
    for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!used.has(code)) return code;
  }
}

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
