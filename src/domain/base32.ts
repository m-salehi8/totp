/**
 * RFC 4648 Base32 Alphabet:
 * A-Z (indices 0-25)
 * 2-7 (indices 26-31)
 */
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const CHAR_MAP: Record<string, number> = {};
for (let i = 0; i < RFC4648_ALPHABET.length; i++) {
  CHAR_MAP[RFC4648_ALPHABET[i]] = i;
}

/**
 * Decodes a Base32 string into a Uint8Array.
 * Tolerates spaces, dashes, lowercase letters, and missing '=' padding.
 */
export function base32Decode(input: string): Uint8Array {
  if (!input || typeof input !== 'string') {
    return new Uint8Array(0);
  }

  // Sanitize: strip whitespace, dashes, and convert to uppercase
  const cleaned = input.replace(/[\s\-_]/g, '').toUpperCase();
  // Strip trailing '=' padding
  const unpadded = cleaned.replace(/=+$/, '');

  if (unpadded.length === 0) {
    return new Uint8Array(0);
  }

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < unpadded.length; i++) {
    const char = unpadded[i];
    const val = CHAR_MAP[char];

    if (val === undefined) {
      throw new Error(`Invalid Base32 character: "${char}"`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Encodes a Uint8Array into an RFC 4648 Base32 string (with optional padding).
 */
export function base32Encode(data: Uint8Array, pad = false): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }

  if (pad) {
    while (output.length % 8 !== 0) {
      output += '=';
    }
  }

  return output;
}
