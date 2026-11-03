export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

export type OtpType = 'totp' | 'hotp';

export interface OtpAccount {
  id: string;
  issuer: string;
  account: string;
  secret: string; // Base32 encoded secret (plain in memory / encrypted in vault payload)
  type: OtpType;
  algorithm: HashAlgorithm;
  digits: number; // usually 6 or 8
  period: number; // default 30 seconds for TOTP
  counter?: number; // for HOTP
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  order: number; // for custom sorting
  iconColor?: string;
}

export interface VaultData {
  version: number;
  updatedAt: number;
  accounts: OtpAccount[];
}

export interface EncryptedPayload {
  version: number;
  kdf: 'PBKDF2';
  kdfParams: {
    salt: string; // base64
    iterations: number;
    hash: string;
  };
  iv: string; // base64 (12 bytes)
  ciphertext: string; // base64
}

export interface AppSettings {
  autoLockMinutes: number; // 0 = immediately, -1 = never, or 1, 5, 15
  lockOnTabHidden: boolean;
  hideCodesByDefault: boolean;
  clipboardClearSeconds: number; // default 30
  biometricsEnabled: boolean;
  pinEnabled: boolean; // optional PIN/Passcode lock screen
  dismissedIosGuide?: boolean;
  webauthnCredentialId?: string;
}
