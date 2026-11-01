export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12; // Standard 96-bit IV for AES-GCM

/**
 * Zero out sensitive typed array memory
 */
export function zeroBuffer(buf: Uint8Array | ArrayBuffer | null | undefined): void {
  if (!buf) return;
  if (buf instanceof Uint8Array) {
    buf.fill(0);
  } else if (buf instanceof ArrayBuffer) {
    new Uint8Array(buf).fill(0);
  }
}

/**
 * Encodes Uint8Array to standard Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes standard Base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a CryptoKey for AES-GCM (256 bits) from a password using PBKDF2 (SHA-256).
 */
export async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  extractable = false
): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  try {
    const keyMaterial = await subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as Uint8Array<ArrayBuffer>,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      extractable,
      ['encrypt', 'decrypt']
    );
  } finally {
    zeroBuffer(passwordBytes);
  }
}

/**
 * Generates cryptographically secure random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
