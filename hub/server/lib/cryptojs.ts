// CryptoJS-compatible AES decrypt: the "passphrase" form of CryptoJS.AES.encrypt(text, secret).
// Output is base64 of "Salted__" + 8 byte salt + AES-256-CBC ciphertext (PKCS7). Key and IV come from OpenSSL's
// EVP_BytesToKey with MD5 and one round. Pure JS MD5 plus WebCrypto, so it runs in Node, workers and edge runtimes.
// Never log the secret, the input or the output.

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
  const len = data.length;
  const blocks = ((len + 8) >> 6) + 1;
  const buf = new Uint8Array(blocks * 64);
  buf.set(data);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(buf.length - 8, (len << 3) >>> 0, true);
  dv.setUint32(buf.length - 4, Math.floor(len / 0x20000000), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < buf.length; off += 64) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + dv.getUint32(off + g * 4, true)) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const o = new DataView(out.buffer);
  o.setUint32(0, a0, true); o.setUint32(4, b0, true); o.setUint32(8, c0, true); o.setUint32(12, d0, true);
  return out;
}

const cat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/** OpenSSL EVP_BytesToKey(MD5, 1 round): 32 byte key and 16 byte IV. */
export function evpKeyIv(pass: Uint8Array, salt: Uint8Array): { key: Uint8Array; iv: Uint8Array } {
  const d1 = md5(cat(pass, salt));
  const d2 = md5(cat(d1, pass, salt));
  const d3 = md5(cat(d2, pass, salt));
  return { key: cat(d1, d2), iv: d3 };
}

const MAX_B64 = 64 * 1024;

/** Decrypts a CryptoJS passphrase-mode string to text. Returns null on any problem (bad base64, bad salt marker, wrong secret). */
export async function decryptCryptoJs(b64: string, secret: string): Promise<string | null> {
  try {
    if (!secret || typeof b64 !== "string" || b64.length > MAX_B64) return null;
    const bin = atob(b64.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, ""));
    const raw = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
    // "Salted__" marker, 8 byte salt, then whole 16 byte blocks.
    if (raw.length < 32 || String.fromCharCode(...raw.slice(0, 8)) !== "Salted__") return null;
    const ct = raw.slice(16);
    if (ct.length % 16 !== 0) return null;
    const { key, iv } = evpKeyIv(new TextEncoder().encode(secret), raw.slice(8, 16));
    const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "AES-CBC" }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv as BufferSource }, k, ct as BufferSource);
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    return null;
  }
}
