/** URL-safe seed for Dicebear (matches typical nanoid-style alphabet). */
const SEED_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

export function randomAvatarSeed(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SEED_ALPHABET[bytes[i]! % SEED_ALPHABET.length]!;
  }
  return out;
}
