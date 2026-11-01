import { parseOtpAuthUri } from '../domain/otpauth';
import type { HashAlgorithm, OtpAccount, OtpType } from '../domain/types';

/**
 * Normalizes algorithm string
 */
function normalizeAlgo(raw?: string): HashAlgorithm {
  if (!raw) return 'SHA-1';
  const clean = raw.toUpperCase().replace('-', '');
  if (clean === 'SHA256') return 'SHA-256';
  if (clean === 'SHA512') return 'SHA-512';
  return 'SHA-1';
}

/**
 * Parses an Aegis JSON export (plain unencrypted JSON or db section)
 */
export function parseAegisJson(json: Record<string, any>): OtpAccount[] {
  const db = json.db || json;
  const entries = db.entries || [];
  if (!Array.isArray(entries)) {
    throw new Error('Invalid Aegis format: missing entries list');
  }

  const accounts: OtpAccount[] = [];
  const now = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const type: OtpType = (entry.type || 'totp').toLowerCase() === 'hotp' ? 'hotp' : 'totp';
    const info = entry.info || {};
    const secret = info.secret || entry.secret;

    if (!secret) continue;

    const account: OtpAccount = {
      id: crypto.randomUUID(),
      issuer: entry.issuer || info.issuer || 'Aegis',
      account: entry.name || info.account || 'Account',
      secret: secret.replace(/[\s\-_]/g, '').toUpperCase(),
      type,
      algorithm: normalizeAlgo(info.algo || entry.algo),
      digits: info.digits || 6,
      period: info.period || 30,
      counter: info.counter || 0,
      createdAt: now,
      updatedAt: now,
      order: i,
    };
    accounts.push(account);
  }

  return accounts;
}

/**
 * Parses a 2FAS JSON export
 */
export function parseTwoFasJson(json: Record<string, any>): OtpAccount[] {
  const services = json.services || [];
  if (!Array.isArray(services)) {
    throw new Error('Invalid 2FAS format: missing services array');
  }

  const accounts: OtpAccount[] = [];
  const now = Date.now();

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    const otp = s.otp || {};
    const secret = s.secret || otp.data?.secret || otp.secret;

    if (!secret) continue;

    const type: OtpType = (otp.tokenType || 'TOTP').toUpperCase() === 'HOTP' ? 'hotp' : 'totp';

    accounts.push({
      id: crypto.randomUUID(),
      issuer: otp.issuer || s.name || '2FAS',
      account: otp.account || s.name || 'Account',
      secret: secret.replace(/[\s\-_]/g, '').toUpperCase(),
      type,
      algorithm: normalizeAlgo(otp.algorithm),
      digits: otp.digits || 6,
      period: otp.period || 30,
      counter: otp.counter || 0,
      createdAt: now,
      updatedAt: now,
      order: i,
    });
  }

  return accounts;
}

/**
 * Parses a plain text list of otpauth:// URIs
 */
export function parseOtpAuthList(text: string): OtpAccount[] {
  const lines = text.split(/\r?\n/);
  const accounts: OtpAccount[] = [];
  const now = Date.now();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('otpauth://')) continue;

    try {
      const parsed = parseOtpAuthUri(line);
      accounts.push({
        id: crypto.randomUUID(),
        issuer: parsed.issuer,
        account: parsed.account,
        secret: parsed.secret,
        type: parsed.type,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period,
        counter: parsed.counter,
        createdAt: now,
        updatedAt: now,
        order: accounts.length,
      });
    } catch {
      // Continue parsing other lines
    }
  }

  return accounts;
}

/**
 * Universal importer: detects whether string/json is Kelidban, Aegis, 2FAS, or plain URIs
 */
export function importUniversal(content: string): {
  type: 'kelidban' | 'aegis' | '2fas' | 'plain';
  accounts?: OtpAccount[];
  rawKelidban?: any;
} {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);

      // Check if it's an encrypted Kelidban backup file
      if (parsed.app === 'kelidban-authenticator' && parsed.ciphertext) {
        return { type: 'kelidban', rawKelidban: parsed };
      }

      // Check Aegis
      if (parsed.db?.entries || parsed.entries) {
        return { type: 'aegis', accounts: parseAegisJson(parsed) };
      }

      // Check 2FAS
      if (parsed.services || parsed.schemaVersion) {
        return { type: '2fas', accounts: parseTwoFasJson(parsed) };
      }

      // Plain accounts list export
      if (Array.isArray(parsed.accounts)) {
        return { type: 'kelidban', accounts: parsed.accounts };
      }
    } catch (e) {
      // Not JSON, fall back to URI parsing
    }
  }

  // Fallback to plain otpauth lines
  const accounts = parseOtpAuthList(trimmed);
  if (accounts.length > 0) {
    return { type: 'plain', accounts };
  }

  throw new Error('Could not recognize file format (supported: Kelidban Backup, Aegis, 2FAS, or otpauth:// list)');
}
