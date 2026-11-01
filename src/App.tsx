/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings, EncryptedPayload, OtpAccount, VaultData } from './domain/types';
import {
  loadEncryptedVault,
  loadSettings,
  saveEncryptedVault,
  saveSettings,
  deleteVault,
  requestPersistentStorage,
} from './storage/db';
import { decryptVault, encryptVault } from './crypto/vaultCrypto';
import { verifyWebAuthnBiometric } from './crypto/webauthn';
import { I18nProvider, useI18n } from './i18n/i18nContext';
import { Header } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { UnlockScreen } from './components/UnlockScreen';
import { AddAccountModal } from './components/AddAccountModal';
import { EditAccountModal } from './components/EditAccountModal';
import { SettingsModal } from './components/SettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Plus, Shield, KeyRound } from 'lucide-react';

function AuthenticatorApp() {
  const { t } = useI18n();

  // App & Vault State
  const [isInitializing, setIsInitializing] = useState(true);
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedPayload | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accounts, setAccounts] = useState<OtpAccount[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoLockMinutes: 5,
    lockOnTabHidden: true,
    hideCodesByDefault: false,
    clipboardClearSeconds: 30,
    biometricsEnabled: false,
  });

  // Master key in memory
  const memoryKeyRef = useRef<{
    key: CryptoKey;
    saltBase64: string;
    iterations: number;
    rawPassword?: string;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OtpAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<OtpAccount | null>(null);

  // Drag and drop state
  const draggedIndexRef = useRef<number | null>(null);

  // Activity timer for auto-lock
  const lastActivityRef = useRef<number>(Date.now());

  // Lock the vault and scrub memory
  const handleLockVault = useCallback(() => {
    setIsUnlocked(false);
    memoryKeyRef.current = null;
  }, []);

  // Initialize DB and load settings/vault
  useEffect(() => {
    const init = async () => {
      try {
        const [savedSettings, vaultPayload] = await Promise.all([
          loadSettings(),
          loadEncryptedVault(),
        ]);

        if (savedSettings) {
          setSettings(savedSettings);
        }

        setEncryptedPayload(vaultPayload);

        // Check storage persistence silently
        requestPersistentStorage().catch(() => {});
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // Update settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Auto-lock on idle timer
  useEffect(() => {
    if (!isUnlocked || settings.autoLockMinutes <= 0) return;

    const checkIdle = () => {
      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= settings.autoLockMinutes) {
        handleLockVault();
      }
    };

    const interval = setInterval(checkIdle, 10000);
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [isUnlocked, settings.autoLockMinutes, handleLockVault]);

  // Auto-lock when tab is hidden
  useEffect(() => {
    if (!isUnlocked || !settings.lockOnTabHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLockVault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, settings.lockOnTabHidden, handleLockVault]);

  // Save vault helper
  const persistVault = async (updatedAccounts: OtpAccount[]) => {
    if (!memoryKeyRef.current) return;

    const vaultData: VaultData = {
      version: 1,
      updatedAt: Date.now(),
      accounts: updatedAccounts,
    };

    const newEncrypted = await encryptVault(vaultData, {
      key: memoryKeyRef.current.key,
      saltBase64: memoryKeyRef.current.saltBase64,
      iterations: memoryKeyRef.current.iterations,
    });

    await saveEncryptedVault(newEncrypted);
    setEncryptedPayload(newEncrypted);
  };

  // Setup Vault (First Run)
  const handleSetupVault = async (masterPassword: string) => {
    const initialVault: VaultData = {
      version: 1,
      updatedAt: Date.now(),
      accounts: [],
    };

    const encrypted = await encryptVault(initialVault, masterPassword);
    await saveEncryptedVault(encrypted);
    setEncryptedPayload(encrypted);

    // Decrypt and keep in memory
    const { key, vault } = await decryptVault(encrypted, masterPassword);
    memoryKeyRef.current = {
      key,
      saltBase64: encrypted.kdfParams.salt,
      iterations: encrypted.kdfParams.iterations,
      rawPassword: masterPassword,
    };

    setAccounts(vault.accounts);
    setIsUnlocked(true);
    requestPersistentStorage();
  };

  // Unlock Vault
  const handleUnlock = async (masterPassword: string): Promise<boolean> => {
    if (!encryptedPayload) return false;

    try {
      const { vault, key } = await decryptVault(encryptedPayload, masterPassword);
      memoryKeyRef.current = {
        key,
        saltBase64: encryptedPayload.kdfParams.salt,
        iterations: encryptedPayload.kdfParams.iterations,
        rawPassword: masterPassword,
      };

      setAccounts(vault.accounts || []);
      setIsUnlocked(true);
      lastActivityRef.current = Date.now();
      return true;
    } catch {
      return false;
    }
  };

  // Biometric Unlock
  const handleBiometricUnlock = async (): Promise<boolean> => {
    if (!settings.webauthnCredentialId) return false;
    const ok = await verifyWebAuthnBiometric(settings.webauthnCredentialId);
    return ok;
  };

  // Change Master Password
  const handleChangeMasterPassword = async (oldPass: string, newPass: string): Promise<boolean> => {
    if (!encryptedPayload) return false;

    try {
      // 1. Verify old password
      const { vault } = await decryptVault(encryptedPayload, oldPass);

      // 2. Encrypt under new password with fresh salt
      const newEncrypted = await encryptVault(vault, newPass);
      await saveEncryptedVault(newEncrypted);
      setEncryptedPayload(newEncrypted);

      // 3. Update memory key
      const { key } = await decryptVault(newEncrypted, newPass);
      memoryKeyRef.current = {
        key,
        saltBase64: newEncrypted.kdfParams.salt,
        iterations: newEncrypted.kdfParams.iterations,
        rawPassword: newPass,
      };

      return true;
    } catch {
      return false;
    }
  };

  // Reset / Wipe Vault
  const handleResetVault = async () => {
    await deleteVault();
    setEncryptedPayload(null);
    setAccounts([]);
    memoryKeyRef.current = null;
    setIsUnlocked(false);
  };

  // Add Account
  const handleAddAccount = async (
    accountData: Omit<OtpAccount, 'id' | 'createdAt' | 'updatedAt' | 'order'>
  ) => {
    const newAccount: OtpAccount = {
      ...accountData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: accounts.length,
    };

    const updated = [newAccount, ...accounts];
    setAccounts(updated);
    await persistVault(updated);
  };

  // Edit Account
  const handleSaveEdit = async (updatedAcc: OtpAccount) => {
    const updated = accounts.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
    setAccounts(updated);
    await persistVault(updated);
    setEditingAccount(null);
  };

  // Delete Account
  const handleConfirmDelete = async (acc: OtpAccount) => {
    const updated = accounts.filter((a) => a.id !== acc.id);
    setAccounts(updated);
    await persistVault(updated);
    setDeletingAccount(null);
  };

  // Move Up / Down
  const handleMoveAccount = async (acc: OtpAccount, direction: 'up' | 'down') => {
    const idx = accounts.findIndex((a) => a.id === acc.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= accounts.length) return;

    const copy = [...accounts];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;

    copy.forEach((item, i) => {
      item.order = i;
    });

    setAccounts(copy);
    await persistVault(copy);
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const copy = [...accounts];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(dropIndex, 0, moved);

    copy.forEach((item, i) => {
      item.order = i;
    });

    draggedIndexRef.current = null;
    setAccounts(copy);
    await persistVault(copy);
  };

  // Update HOTP Counter
  const handleUpdateCounter = async (acc: OtpAccount, newCounter: number) => {
    const updated = accounts.map((a) =>
      a.id === acc.id ? { ...a, counter: newCounter, updatedAt: Date.now() } : a
    );
    setAccounts(updated);
    await persistVault(updated);
  };

  // Import Accounts
  const handleImportAccounts = async (importedList: OtpAccount[]) => {
    const currentIds = new Set(accounts.map((a) => a.id));
    const sanitized = importedList.map((a, i) => ({
      ...a,
      id: currentIds.has(a.id) ? crypto.randomUUID() : a.id,
      order: accounts.length + i,
    }));

    const merged = [...accounts, ...sanitized];
    setAccounts(merged);
    await persistVault(merged);
  };

  // Filter accounts by search query
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      acc.issuer.toLowerCase().includes(q) ||
      acc.account.toLowerCase().includes(q)
    );
  });

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Shield className="h-10 w-10 text-indigo-500 animate-pulse" />
      </div>
    );
  }

  // Not unlocked -> show Master Password Unlock / Setup screen
  if (!isUnlocked) {
    return (
      <UnlockScreen
        isFirstRun={!encryptedPayload}
        onUnlock={handleUnlock}
        onSetupVault={handleSetupVault}
        onBiometricUnlock={settings.biometricsEnabled ? handleBiometricUnlock : undefined}
        hasBiometrics={settings.biometricsEnabled}
        onResetVault={encryptedPayload ? handleResetVault : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* App Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLockVault={handleLockVault}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 sm:px-4 py-3.5 sm:py-5 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:pb-8">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-5 sm:px-6 py-12 sm:py-20 text-center backdrop-blur-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 mb-4 shadow-sm">
              <KeyRound className="h-8 w-8" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white mb-1">
              {searchQuery ? 'حسابی یافت نشد' : t('noAccounts')}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
              {searchQuery
                ? 'نتیجه‌ای متناسب با عبارت جستجو پیدا نشد.'
                : t('noAccountsDesc')}
            </p>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addAccount')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {filteredAccounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                index={index}
                totalCount={filteredAccounts.length}
                hideCodesByDefault={settings.hideCodesByDefault}
                clipboardClearSeconds={settings.clipboardClearSeconds}
                onEdit={setEditingAccount}
                onDelete={setDeletingAccount}
                onMoveUp={(acc) => handleMoveAccount(acc, 'up')}
                onMoveDown={(acc) => handleMoveAccount(acc, 'down')}
                onUpdateCounter={handleUpdateCounter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Add Button for Mobile (Thumb-accessible) */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] end-5 z-30 sm:hidden">
        <button
          onClick={() => setIsAddModalOpen(true)}
          aria-label={t('addAccount')}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/50 active:scale-90 transition border border-indigo-400/30"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAccount={handleAddAccount}
        existingAccounts={accounts}
      />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={Boolean(editingAccount)}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingAccount)}
        account={deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Settings & Backup Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        accounts={accounts}
        onChangeMasterPassword={handleChangeMasterPassword}
        onImportAccounts={handleImportAccounts}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthenticatorApp />
    </I18nProvider>
  );
}
