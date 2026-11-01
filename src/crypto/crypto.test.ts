import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptVault, decryptVault } from './vaultCrypto';
import { createEncryptedBackup, restoreEncryptedBackup } from './backupCrypto';
import { parseOtpAuthUri, buildOtpAuthUri } from '../domain/otpauth';
import { toJalaali, getJalaliBackupFilename, formatJalaliDate } from '../domain/jalaali';
import { parseAegisJson, parseTwoFasJson, parseOtpAuthList } from './importParsers';
import type { VaultData, OtpAccount } from '../domain/types';

test('Vault AES-256-GCM encryption and decryption roundtrip', async () => {
  const mockVault: VaultData = {
    version: 1,
    updatedAt: Date.now(),
    accounts: [
      {
        id: 'acc-1',
        issuer: 'Google',
        account: 'test@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp',
        algorithm: 'SHA-1',
        digits: 6,
        period: 30,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: 0,
      },
    ],
  };

  const password = 'StrongMasterPassword!@#123';

  // Encrypt
  const encrypted = await encryptVault(mockVault, password);
  assert.equal(encrypted.version, 1);
  assert.equal(encrypted.kdf, 'PBKDF2');
  assert.ok(encrypted.ciphertext.length > 20);
  assert.ok(encrypted.iv.length > 10);
  assert.ok(encrypted.kdfParams.salt.length > 10);

  // Decrypt with correct password
  const { vault: decrypted } = await decryptVault(encrypted, password);
  assert.deepEqual(decrypted, mockVault);

  // Decrypt with wrong password should fail
  await assert.rejects(
    async () => {
      await decryptVault(encrypted, 'WrongPassword999!');
    },
    /Decryption failed/
  );
});

test('Backup export and restore with user backup password', async () => {
  const accounts: OtpAccount[] = [
    {
      id: 'acc-2',
      issuer: 'GitHub',
      account: 'octocat',
      secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
      type: 'totp',
      algorithm: 'SHA-256',
      digits: 6,
      period: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: 0,
    },
  ];

  const backupPass = 'MyBackupKey$2026';
  const backupJson = await createEncryptedBackup(accounts, backupPass);
  const parsedBackup = JSON.parse(backupJson);

  assert.equal(parsedBackup.app, 'kelidban-authenticator');
  assert.ok(parsedBackup.jalaliDate);

  // Restore
  const restored = await restoreEncryptedBackup(backupJson, backupPass);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].issuer, 'GitHub');
  assert.equal(restored[0].secret, accounts[0].secret);

  // Restore with wrong password
  await assert.rejects(
    async () => {
      await restoreEncryptedBackup(backupJson, 'InvalidPass!');
    },
    /Decryption failed/
  );
});

test('otpauth:// URI parsing and roundtrip', () => {
  const uri = 'otpauth://totp/GitHub:user%40github.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA256&digits=8&period=60';
  const parsed = parseOtpAuthUri(uri);

  assert.equal(parsed.type, 'totp');
  assert.equal(parsed.issuer, 'GitHub');
  assert.equal(parsed.account, 'user@github.com');
  assert.equal(parsed.secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(parsed.algorithm, 'SHA-256');
  assert.equal(parsed.digits, 8);
  assert.equal(parsed.period, 60);

  const serialized = buildOtpAuthUri({
    id: '1',
    ...parsed,
    createdAt: 0,
    updatedAt: 0,
    order: 0,
  });

  const reparsed = parseOtpAuthUri(serialized);
  assert.equal(reparsed.issuer, parsed.issuer);
  assert.equal(reparsed.secret, parsed.secret);
  assert.equal(reparsed.digits, parsed.digits);
  assert.equal(reparsed.period, parsed.period);
});

test('Jalali calendar conversion and backup filename', () => {
  // 2026-03-21 is 1405-01-01 (Nowruz)
  const j = toJalaali(2026, 3, 21);
  assert.equal(j.jy, 1405);
  assert.equal(j.jm, 1);
  assert.equal(j.jd, 1);

  const filename = getJalaliBackupFilename(new Date(2026, 2, 21, 14, 30));
  assert.ok(filename.startsWith('kelidban-backup-1405-01-01'));
  assert.ok(filename.endsWith('.enc'));
});

test('Third-party import formats (Aegis & 2FAS & URI list)', () => {
  // Aegis JSON
  const aegis = {
    version: 1,
    db: {
      version: 1,
      entries: [
        {
          type: 'totp',
          name: 'me@example.com',
          issuer: 'Cloudflare',
          info: { secret: 'JBSWY3DPEHPK3PXP', algo: 'SHA1', digits: 6, period: 30 },
        },
      ],
    },
  };
  const aegisAccounts = parseAegisJson(aegis);
  assert.equal(aegisAccounts.length, 1);
  assert.equal(aegisAccounts[0].issuer, 'Cloudflare');

  // 2FAS JSON
  const twoFas = {
    schemaVersion: 3,
    services: [
      {
        name: 'Amazon',
        otp: {
          account: 'buyer',
          issuer: 'Amazon',
          tokenType: 'TOTP',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        },
        secret: 'JBSWY3DPEHPK3PXP',
      },
    ],
  };
  const twoFasAccounts = parseTwoFasJson(twoFas);
  assert.equal(twoFasAccounts.length, 1);
  assert.equal(twoFasAccounts[0].issuer, 'Amazon');

  // Multi-line otpauth URI list
  const uriList = `
    otpauth://totp/Test1?secret=JBSWY3DPEHPK3PXP
    # comments or blank
    otpauth://totp/Test2?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ
  `;
  const plainAccounts = parseOtpAuthList(uriList);
  assert.equal(plainAccounts.length, 2);
});
