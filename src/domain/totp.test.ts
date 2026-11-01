import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHotp, generateTotp, formatOtpCode } from './totp';
import { base32Decode, base32Encode } from './base32';

// RFC 6238 Appendix B Test Keys
const textEncoder = new TextEncoder();
const KEY_SHA1 = textEncoder.encode('12345678901234567890');
const KEY_SHA256 = textEncoder.encode('12345678901234567890123456789012');
const KEY_SHA512 = textEncoder.encode('1234567890123456789012345678901234567890123456789012345678901234');

test('RFC 6238 TOTP SHA-1 test vectors (8 digits, period 30s)', async () => {
  const vectors = [
    { time: 59, expected: '94287082' },
    { time: 1111111109, expected: '07081804' },
    { time: 1111111111, expected: '14050471' },
    { time: 1234567890, expected: '89005924' },
    { time: 2000000000, expected: '69279037' },
    { time: 20000000000, expected: '65353130' },
  ];

  for (const v of vectors) {
    const code = await generateTotp(KEY_SHA1, {
      algorithm: 'SHA-1',
      digits: 8,
      period: 30,
      timestampMs: v.time * 1000,
    });
    assert.equal(code, v.expected, `SHA-1 failed for time ${v.time}`);
  }
});

test('RFC 6238 TOTP SHA-256 test vectors (8 digits, period 30s)', async () => {
  const vectors = [
    { time: 59, expected: '46119246' },
    { time: 1111111109, expected: '68084774' },
    { time: 1111111111, expected: '67062674' },
    { time: 1234567890, expected: '91819424' },
    { time: 2000000000, expected: '90698825' },
    { time: 20000000000, expected: '77737706' },
  ];

  for (const v of vectors) {
    const code = await generateTotp(KEY_SHA256, {
      algorithm: 'SHA-256',
      digits: 8,
      period: 30,
      timestampMs: v.time * 1000,
    });
    assert.equal(code, v.expected, `SHA-256 failed for time ${v.time}`);
  }
});

test('RFC 6238 TOTP SHA-512 test vectors (8 digits, period 30s)', async () => {
  const vectors = [
    { time: 59, expected: '90693936' },
    { time: 1111111109, expected: '25091201' },
    { time: 1111111111, expected: '99943326' },
    { time: 1234567890, expected: '93441116' },
    { time: 2000000000, expected: '38618901' },
    { time: 20000000000, expected: '47863826' },
  ];

  for (const v of vectors) {
    const code = await generateTotp(KEY_SHA512, {
      algorithm: 'SHA-512',
      digits: 8,
      period: 30,
      timestampMs: v.time * 1000,
    });
    assert.equal(code, v.expected, `SHA-512 failed for time ${v.time}`);
  }
});

test('RFC 4226 HOTP test vectors (6 digits)', async () => {
  // Key: '12345678901234567890'
  const expectedHotp = [
    '755224',
    '287082',
    '359152',
    '969429',
    '338314',
    '254676',
    '287922',
    '162583',
    '399871',
    '520489',
  ];

  for (let count = 0; count < expectedHotp.length; count++) {
    const code = await generateHotp(KEY_SHA1, count, { digits: 6, algorithm: 'SHA-1' });
    assert.equal(code, expectedHotp[count], `HOTP failed for count ${count}`);
  }
});

test('Base32 decoding tolerance (lowercase, spaces, padding)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const decodedStandard = base32Decode(secret);
  assert.equal(decodedStandard.length, 10);

  // Lowercase with spaces and padding
  const tolerant = base32Decode(' jbsw y3dp ehpk 3pxp==== ');
  assert.deepEqual(tolerant, decodedStandard);

  // Roundtrip
  const encoded = base32Encode(decodedStandard);
  assert.equal(encoded, secret);
});

test('Code formatting helper', () => {
  assert.equal(formatOtpCode('123456'), '123 456');
  assert.equal(formatOtpCode('12345678'), '1234 5678');
});
