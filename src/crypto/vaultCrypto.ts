import type { EncryptedPayload, VaultData } from '../domain/types';
import {
  base64ToBytes,
  bytesToBase64,
  DEFAULT_PBKDF2_ITERATIONS,
  deriveAesKey,
  getRandomBytes,
  IV_BYTE_LENGTH,
  SALT_BYTE_LENGTH,
  zeroBuffer,
} from './kdf';

const VAULT_FORMAT_VERSION = 1;

/**
 * Encrypts vault data using a password or existing CryptoKey.
 * Generates fresh salt and fresh 12-byte IV every time.
 */
export async function encryptVault(
  vault: VaultData,
  passwordOrKey: string | { key: CryptoKey; saltBase64: string; iterations: number }
): Promise<EncryptedPayload> {
  const subtle = globalThis.crypto.subtle;
  const iv = getRandomBytes(IV_BYTE_LENGTH);
  const jsonString = JSON.stringify(vault);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(jsonString);

  let key: CryptoKey;
  let saltBytes: Uint8Array;
  let iterations: number;

  if (typeof passwordOrKey === 'string') {
    saltBytes = getRandomBytes(SALT_BYTE_LENGTH);
    iterations = DEFAULT_PBKDF2_ITERATIONS;
    key = await deriveAesKey(passwordOrKey, saltBytes, iterations);
  } else {
    key = passwordOrKey.key;
    saltBytes = base64ToBytes(passwordOrKey.saltBase64);
    iterations = passwordOrKey.iterations;
  }

  try {
    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as Uint8Array<ArrayBuffer>,
        tagLength: 128,
      },
      key,
      plaintextBytes
    );

    return {
      version: VAULT_FORMAT_VERSION,
      kdf: 'PBKDF2',
      kdfParams: {
        salt: bytesToBase64(saltBytes),
        iterations,
        hash: 'SHA-256',
      },
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    };
  } finally {
    zeroBuffer(plaintextBytes);
  }
}

/**
 * Decrypts encrypted payload using master password.
 * Returns decrypted VaultData and the derived CryptoKey for subsequent saves in memory.
 */
export async function decryptVault(
  payload: EncryptedPayload,
  password: string
): Promise<{ vault: VaultData; key: CryptoKey }> {
  const subtle = globalThis.crypto.subtle;

  if (!payload || !payload.ciphertext || !payload.iv || !payload.kdfParams) {
    throw new Error('Invalid vault payload format');
  }

  const saltBytes = base64ToBytes(payload.kdfParams.salt);
  const ivBytes = base64ToBytes(payload.iv);
  const ciphertextBytes = base64ToBytes(payload.ciphertext);
  const iterations = payload.kdfParams.iterations || DEFAULT_PBKDF2_ITERATIONS;

  const key = await deriveAesKey(password, saltBytes, iterations);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as Uint8Array<ArrayBuffer>,
        tagLength: 128,
      },
      key,
      ciphertextBytes as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    const vault = JSON.parse(jsonString) as VaultData;

    return { vault, key };
  } catch {
    throw new Error('Decryption failed: Incorrect password or corrupt vault data');
  }
}
