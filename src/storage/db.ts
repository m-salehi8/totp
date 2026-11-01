import type { AppSettings, EncryptedPayload } from '../domain/types';

const DB_NAME = 'kelidban_db';
const DB_VERSION = 1;
const VAULT_STORE = 'vault_store';
const SETTINGS_STORE = 'settings_store';

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 5,
  lockOnTabHidden: true,
  hideCodesByDefault: false,
  clipboardClearSeconds: 30,
  biometricsEnabled: false,
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser or private browsing mode restricts it.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

/**
 * Saves encrypted vault payload to IndexedDB.
 */
export async function saveEncryptedVault(payload: EncryptedPayload): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite');
    const store = tx.objectStore(VAULT_STORE);
    const req = store.put({ id: 'primary_vault', payload, updatedAt: Date.now() });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to save vault'));
  });
}

/**
 * Loads encrypted vault payload from IndexedDB.
 */
export async function loadEncryptedVault(): Promise<EncryptedPayload | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly');
    const store = tx.objectStore(VAULT_STORE);
    const req = store.get('primary_vault');

    req.onsuccess = () => {
      const result = req.result;
      resolve(result ? result.payload : null);
    };
    req.onerror = () => reject(req.error || new Error('Failed to load vault'));
  });
}

/**
 * Deletes the vault completely (for factory reset)
 */
export async function deleteVault(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite');
    const store = tx.objectStore(VAULT_STORE);
    const req = store.delete('primary_vault');

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to delete vault'));
  });
}

/**
 * Saves app preferences / settings to IndexedDB
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    const req = store.put({ id: 'app_settings', settings });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to save settings'));
  });
}

/**
 * Loads app preferences / settings from IndexedDB
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.get('app_settings');

      req.onsuccess = () => {
        const result = req.result;
        resolve(result && result.settings ? { ...DEFAULT_SETTINGS, ...result.settings } : DEFAULT_SETTINGS);
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Requests persistent storage from navigator.storage.persist()
 */
export async function requestPersistentStorage(): Promise<{
  supported: boolean;
  persisted: boolean;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) {
        return { supported: true, persisted: true };
      }
      const granted = await navigator.storage.persist();
      return { supported: true, persisted: granted };
    } catch {
      return { supported: true, persisted: false };
    }
  }
  return { supported: false, persisted: false };
}
