import { base32Decode } from './base32';
import type { HashAlgorithm } from './types';

export interface TotpOptions {
  algorithm?: HashAlgorithm;
  digits?: number;
  period?: number;
  timestampMs?: number;
  timeOffsetMs?: number;
}

export interface HotpOptions {
  algorithm?: HashAlgorithm;
  digits?: number;
}

/**
 * Standard Web Crypto subtle accessor (browser & modern Node)
 */
function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment');
  }
  return subtle;
}

/**
 * Maps HashAlgorithm string to Web Crypto format
 */
function normalizeAlgorithm(algo: HashAlgorithm = 'SHA-1'): string {
  const upper = algo.toUpperCase();
  if (upper === 'SHA1' || upper === 'SHA-1') return 'SHA-1';
  if (upper === 'SHA256' || upper === 'SHA-256') return 'SHA-256';
  if (upper === 'SHA512' || upper === 'SHA-512') return 'SHA-512';
  return 'SHA-1';
}

/**
 * Computes HOTP per RFC 4226 using Web Crypto API.
 * Supports Uint8Array or Base32 string secret.
 */
export async function generateHotp(
  secret: string | Uint8Array,
  counter: number | bigint,
  options: HotpOptions = {}
): Promise<string> {
  const subtle = getSubtleCrypto();
  const digits = options.digits ?? 6;
  const algoName = normalizeAlgorithm(options.algorithm);

  const keyBytes = typeof secret === 'string' ? base32Decode(secret) : secret;
  if (keyBytes.length === 0) {
    throw new Error('Secret key cannot be empty');
  }

  // Import HMAC key
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: { name: algoName } },
    false,
    ['sign']
  );

  // Convert counter to 8-byte big-endian ArrayBuffer
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setBigUint64(0, BigInt(counter), false); // Big-Endian

  // Sign with HMAC
  const signature = await subtle.sign('HMAC', cryptoKey, counterBuffer);
  const hmacBytes = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const binary =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/**
 * Computes TOTP per RFC 6238 using Web Crypto API.
 */
export async function generateTotp(
  secret: string | Uint8Array,
  options: TotpOptions = {}
): Promise<string> {
  const period = options.period ?? 30;
  const nowMs = (options.timestampMs ?? Date.now()) + (options.timeOffsetMs ?? 0);
  const timestampSec = Math.floor(nowMs / 1000);
  const counter = Math.floor(timestampSec / period);

  return generateHotp(secret, counter, {
    algorithm: options.algorithm,
    digits: options.digits,
  });
}

/**
 * Computes the remaining seconds in the current TOTP period.
 */
export function getRemainingSeconds(
  period = 30,
  timeOffsetMs = 0,
  nowMs = Date.now()
): number {
  const adjustedSec = Math.floor((nowMs + timeOffsetMs) / 1000);
  const elapsed = adjustedSec % period;
  return period - elapsed;
}

/**
 * Returns progress ratio (0 to 1) for the countdown ring.
 * 1 = full period remaining, 0 = period expired.
 */
export function getCountdownProgress(
  period = 30,
  timeOffsetMs = 0,
  nowMs = Date.now()
): number {
  const adjustedSec = (nowMs + timeOffsetMs) / 1000;
  const elapsed = adjustedSec % period;
  const remaining = period - elapsed;
  return Math.max(0, Math.min(1, remaining / period));
}

/**
 * Format code for user display, e.g. "123 456" or "1234 5678"
 */
export function formatOtpCode(code: string): string {
  if (!code) return '';
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}
