import { base64ToBytes, bytesToBase64, getRandomBytes } from './kdf';

export interface WebAuthnSetupResult {
  credentialId: string;
  hasPrf: boolean;
}

/**
 * Checks if platform biometrics (Face ID, Touch ID, Windows Hello, Android Biometrics) are supported
 */
export async function isWebAuthnSupported(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !window.navigator.credentials
  ) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register WebAuthn biometric credential
 */
export async function registerWebAuthnBiometric(
  username = 'Kelidban User'
): Promise<WebAuthnSetupResult> {
  if (!(await isWebAuthnSupported())) {
    throw new Error('Biometric authentication is not supported on this device/browser');
  }

  const challenge = getRandomBytes(32);
  const userId = getRandomBytes(16);

  const creationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge: challenge as Uint8Array<ArrayBuffer>,
      rp: {
        name: 'Kelidban Authenticator',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userId as Uint8Array<ArrayBuffer>,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      extensions: {
        // Request PRF extension if supported
        prf: {},
      } as any,
    },
  };

  const credential = (await navigator.credentials.create(
    creationOptions
  )) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric setup was cancelled or failed');
  }

  const rawIdBytes = new Uint8Array(credential.rawId);
  const credentialId = bytesToBase64(rawIdBytes);

  const clientExtensionResults = credential.getClientExtensionResults() as any;
  const hasPrf = Boolean(clientExtensionResults?.prf?.enabled);

  return { credentialId, hasPrf };
}

/**
 * Authenticates user via WebAuthn platform biometrics
 */
export async function verifyWebAuthnBiometric(
  credentialIdBase64: string
): Promise<boolean> {
  if (!(await isWebAuthnSupported())) {
    return false;
  }

  const challenge = getRandomBytes(32);
  const credIdBytes = base64ToBytes(credentialIdBase64);

  const requestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: challenge as Uint8Array<ArrayBuffer>,
      timeout: 60000,
      rpId: window.location.hostname || 'localhost',
      allowCredentials: [
        {
          id: credIdBytes as Uint8Array<ArrayBuffer>,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
    },
  };

  try {
    const assertion = await navigator.credentials.get(requestOptions);
    return Boolean(assertion);
  } catch {
    return false;
  }
}
