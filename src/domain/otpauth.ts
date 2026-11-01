import type { HashAlgorithm, OtpAccount, OtpType } from './types';

export interface ParsedOtpAuth {
  type: OtpType;
  issuer: string;
  account: string;
  secret: string;
  algorithm: HashAlgorithm;
  digits: number;
  period: number;
  counter?: number;
}

/**
 * Normalizes algorithm string to HashAlgorithm
 */
function parseAlgorithm(raw?: string | null): HashAlgorithm {
  if (!raw) return 'SHA-1';
  const upper = raw.toUpperCase().replace('-', '');
  if (upper === 'SHA256') return 'SHA-256';
  if (upper === 'SHA512') return 'SHA-512';
  return 'SHA-1';
}

/**
 * Parses an otpauth URI (e.g. otpauth://totp/GitHub:user?secret=JBSWY3DPEHPK3PXP&issuer=GitHub)
 */
export function parseOtpAuthUri(uriString: string): ParsedOtpAuth {
  const trimmed = uriString.trim();
  if (!trimmed.startsWith('otpauth://')) {
    throw new Error('URI must start with "otpauth://"');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Malformed URI structure');
  }

  const typeStr = url.host.toLowerCase();
  if (typeStr !== 'totp' && typeStr !== 'hotp') {
    throw new Error(`Unsupported OTP type: "${url.host}". Expected "totp" or "hotp".`);
  }
  const type: OtpType = typeStr;

  // Path contains label: "/Issuer:Account" or "/Account"
  let path = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  let issuerFromLabel = '';
  let account = path;

  if (path.includes(':')) {
    const parts = path.split(':');
    issuerFromLabel = parts[0].trim();
    account = parts.slice(1).join(':').trim();
  }

  const params = url.searchParams;
  const secret = (params.get('secret') || '').replace(/[\s\-_]/g, '').toUpperCase();
  if (!secret) {
    throw new Error('Missing "secret" parameter in URI');
  }

  const issuerParam = params.get('issuer')?.trim() || '';
  const issuer = issuerParam || issuerFromLabel || 'Unknown';

  const digitsParam = parseInt(params.get('digits') || '6', 10);
  const digits = digitsParam === 8 ? 8 : 6;

  const periodParam = parseInt(params.get('period') || '30', 10);
  const period = isNaN(periodParam) || periodParam <= 0 ? 30 : periodParam;

  const algorithm = parseAlgorithm(params.get('algorithm'));

  let counter: number | undefined = undefined;
  if (type === 'hotp') {
    const counterParam = parseInt(params.get('counter') || '0', 10);
    counter = isNaN(counterParam) ? 0 : counterParam;
  }

  return {
    type,
    issuer,
    account: account || 'Account',
    secret,
    algorithm,
    digits,
    period,
    counter,
  };
}

/**
 * Generates an otpauth:// URI from an account
 */
export function buildOtpAuthUri(account: OtpAccount): string {
  const type = account.type || 'totp';
  const label = account.issuer
    ? `${encodeURIComponent(account.issuer)}:${encodeURIComponent(account.account)}`
    : encodeURIComponent(account.account);

  const params = new URLSearchParams();
  params.set('secret', account.secret.replace(/[\s\-_]/g, '').toUpperCase());

  if (account.issuer) {
    params.set('issuer', account.issuer);
  }

  if (account.algorithm && account.algorithm !== 'SHA-1') {
    params.set('algorithm', account.algorithm.replace('-', ''));
  }

  if (account.digits && account.digits !== 6) {
    params.set('digits', account.digits.toString());
  }

  if (type === 'totp' && account.period && account.period !== 30) {
    params.set('period', account.period.toString());
  }

  if (type === 'hotp') {
    params.set('counter', (account.counter ?? 0).toString());
  }

  return `otpauth://${type}/${label}?${params.toString()}`;
}
