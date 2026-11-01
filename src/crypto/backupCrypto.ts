import { formatJalaliDate } from '../domain/jalaali';
import type { OtpAccount } from '../domain/types';
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

export interface EncryptedBackupFile {
  app: 'kelidban-authenticator';
  version: number;
  createdAt: number;
  jalaliDate: string;
  kdf: 'PBKDF2';
  kdfParams: {
    salt: string;
    iterations: number;
    hash: string;
  };
  iv: string;
  ciphertext: string;
}

/**
 * Exports account list to an encrypted backup file JSON string
 */
export async function createEncryptedBackup(
  accounts: OtpAccount[],
  backupPassword: string
): Promise<string> {
  if (!backupPassword || backupPassword.length < 6) {
    throw new Error('Backup password must be at least 6 characters long');
  }

  const subtle = globalThis.crypto.subtle;
  const salt = getRandomBytes(SALT_BYTE_LENGTH);
  const iv = getRandomBytes(IV_BYTE_LENGTH);
  const iterations = DEFAULT_PBKDF2_ITERATIONS;

  const key = await deriveAesKey(backupPassword, salt, iterations);

  const payload = {
    accounts,
    exportedAt: Date.now(),
    count: accounts.length,
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));

  try {
    const encryptedBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as Uint8Array<ArrayBuffer>,
        tagLength: 128,
      },
      key,
      jsonBytes
    );

    const now = new Date();
    const jalaliFormatted = formatJalaliDate(now, { persianDigits: false, format: 'numeric' });

    const backupFile: EncryptedBackupFile = {
      app: 'kelidban-authenticator',
      version: 1,
      createdAt: now.getTime(),
      jalaliDate: jalaliFormatted,
      kdf: 'PBKDF2',
      kdfParams: {
        salt: bytesToBase64(salt),
        iterations,
        hash: 'SHA-256',
      },
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    };

    return JSON.stringify(backupFile, null, 2);
  } finally {
    zeroBuffer(jsonBytes);
  }
}

/**
 * Restores accounts from an encrypted backup file
 */
export async function restoreEncryptedBackup(
  backupJson: string | EncryptedBackupFile,
  backupPassword: string
): Promise<OtpAccount[]> {
  const file: EncryptedBackupFile =
    typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;

  if (file.app !== 'kelidban-authenticator') {
    throw new Error('Not a recognized Kelidban backup file');
  }

  const subtle = globalThis.crypto.subtle;
  const salt = base64ToBytes(file.kdfParams.salt);
  const iv = base64ToBytes(file.iv);
  const ciphertext = base64ToBytes(file.ciphertext);
  const iterations = file.kdfParams.iterations || DEFAULT_PBKDF2_ITERATIONS;

  const key = await deriveAesKey(backupPassword, salt, iterations);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as Uint8Array<ArrayBuffer>,
        tagLength: 128,
      },
      key,
      ciphertext as BufferSource
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed.accounts)) {
      throw new Error('Backup payload missing accounts array');
    }

    return parsed.accounts as OtpAccount[];
  } catch {
    throw new Error('Decryption failed: Incorrect backup password or corrupted backup file');
  }
}
