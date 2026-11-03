/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings, EncryptedPayload, OtpAccount, VaultData } from './domain/types';
import {
  loadEncryptedVault,
  loadPlainAccounts,
  loadSettings,
  saveEncryptedVault,
  savePlainAccounts,
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
import { IOSInstallGuide } from './components/IOSInstallGuide';
import { LandingPage } from './components/LandingPage';
import { Plus, Shield, KeyRound, Check, Sparkles } from 'lucide-react';

function AuthenticatorApp({ onOpenLanding }: { onOpenLanding?: () => void }) {
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
    pinEnabled: false,
    dismissedIosGuide: false,
  });

  // Master key in memory (when vault is encrypted)
  const memoryKeyRef = useRef<{
    key: CryptoKey;
    saltBase64: string;
    iterations: number;
    rawPassword?: string;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OtpAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<OtpAccount | null>(null);

  // Drag and drop state
  const draggedIndexRef = useRef<number | null>(null);

  // Activity timer for auto-lock
  const lastActivityRef = useRef<number>(Date.now());

  // Show Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  }, []);

  // Lock the vault and scrub memory
  const handleLockVault = useCallback(() => {
    if (encryptedPayload) {
      setIsUnlocked(false);
      memoryKeyRef.current = null;
    }
  }, [encryptedPayload]);

  // Initialize DB and load settings/vault
  useEffect(() => {
    const init = async () => {
      try {
        const [savedSettings, vaultPayload, plainAccs] = await Promise.all([
          loadSettings(),
          loadEncryptedVault(),
          loadPlainAccounts(),
        ]);

        if (savedSettings) {
          setSettings(savedSettings);
        }

        if (vaultPayload) {
          setEncryptedPayload(vaultPayload);
          setIsUnlocked(false);
        } else if (plainAccs) {
          setAccounts(plainAccs);
          setIsUnlocked(true);
        } else {
          // First run - check if user wants PIN or direct access
          setIsUnlocked(false);
        }

        // Request Persistent Storage in iOS / modern browser
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
    if (!isUnlocked || !encryptedPayload || settings.autoLockMinutes <= 0) return;

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
  }, [isUnlocked, encryptedPayload, settings.autoLockMinutes, handleLockVault]);

  // Auto-lock when tab is hidden
  useEffect(() => {
    if (!isUnlocked || !encryptedPayload || !settings.lockOnTabHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLockVault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, encryptedPayload, settings.lockOnTabHidden, handleLockVault]);

  // Save accounts helper (handles both encrypted vault & plain accounts in IndexedDB)
  const persistVault = async (updatedAccounts: OtpAccount[]) => {
    if (encryptedPayload && memoryKeyRef.current) {
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
    } else {
      await savePlainAccounts(updatedAccounts);
    }
  };

  // Setup Vault with PIN (First Run)
  const handleSetupVault = async (masterPassword: string) => {
    const initialVault: VaultData = {
      version: 1,
      updatedAt: Date.now(),
      accounts: accounts.length > 0 ? accounts : [],
    };

    const encrypted = await encryptVault(initialVault, masterPassword);
    await saveEncryptedVault(encrypted);
    setEncryptedPayload(encrypted);

    const { key, vault } = await decryptVault(encrypted, masterPassword);
    memoryKeyRef.current = {
      key,
      saltBase64: encrypted.kdfParams.salt,
      iterations: encrypted.kdfParams.iterations,
      rawPassword: masterPassword,
    };

    setAccounts(vault.accounts);
    setIsUnlocked(true);
    await handleSaveSettings({ ...settings, pinEnabled: true });
    requestPersistentStorage();
    showToast('گاوصندوق با موفقیت رمزنگاری شد');
  };

  // Skip PIN on first run for instant quick access
  const handleSkipPin = async () => {
    await savePlainAccounts(accounts);
    setIsUnlocked(true);
    await handleSaveSettings({ ...settings, pinEnabled: false });
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
      const { vault } = await decryptVault(encryptedPayload, oldPass);
      const newEncrypted = await encryptVault(vault, newPass);
      await saveEncryptedVault(newEncrypted);
      setEncryptedPayload(newEncrypted);

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

  // Enable PIN lock from Settings
  const handleEnablePinLock = async (pin: string): Promise<void> => {
    await handleSetupVault(pin);
  };

  // Disable PIN lock from Settings
  const handleDisablePinLock = async (currentPin: string): Promise<boolean> => {
    if (!encryptedPayload) return false;

    try {
      const { vault } = await decryptVault(encryptedPayload, currentPin);
      await savePlainAccounts(vault.accounts);
      setEncryptedPayload(null);
      memoryKeyRef.current = null;
      await handleSaveSettings({ ...settings, pinEnabled: false });
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
    showToast('حساب جدید اضافه شد');
  };

  // Edit Account
  const handleSaveEdit = async (updatedAcc: OtpAccount) => {
    const updated = accounts.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
    setAccounts(updated);
    await persistVault(updated);
    setEditingAccount(null);
    showToast('تغییرات ذخیره شد');
  };

  // Delete Account
  const handleConfirmDelete = async (acc: OtpAccount) => {
    const updated = accounts.filter((a) => a.id !== acc.id);
    setAccounts(updated);
    await persistVault(updated);
    setDeletingAccount(null);
    showToast('حساب حذف شد');
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
    showToast(`${sanitized.length} حساب وارد شد`);
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
      <div className="flex min-h-screen items-center justify-center bg-[#fffcfc] text-[#5a1414]">
        <Shield className="h-12 w-12 text-[#5a1414] animate-pulse" />
      </div>
    );
  }

  // Not unlocked -> show Master Password / PIN Unlock or Initial Setup screen
  if (!isUnlocked) {
    return (
      <UnlockScreen
        isFirstRun={!encryptedPayload && accounts.length === 0}
        onUnlock={handleUnlock}
        onSetupVault={handleSetupVault}
        onSkipPin={handleSkipPin}
        onBiometricUnlock={settings.biometricsEnabled ? handleBiometricUnlock : undefined}
        hasBiometrics={settings.biometricsEnabled}
        onResetVault={encryptedPayload ? handleResetVault : undefined}
        onOpenLanding={onOpenLanding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fffcfc] text-[#2b1313] flex flex-col selection:bg-[#f2c6c6] selection:text-[#5a1414]">
      {/* App Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLockVault={handleLockVault}
        onOpenLanding={onOpenLanding}
        hasPinLock={Boolean(encryptedPayload)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3.5 sm:px-4 py-4 sm:py-6 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:pb-8">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#efdcdc] bg-white px-5 sm:px-6 py-12 sm:py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fcf2f2] border border-[#efdcdc] text-[#5a1414] mb-4 shadow-sm">
              <KeyRound className="h-8 w-8" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-[#2b1313] mb-1">
              {searchQuery ? 'حسابی یافت نشد' : 'هنوز حسابی اضافه نکرده‌اید'}
            </h2>
            <p className="text-xs text-[#7b6464] max-w-xs mb-6 leading-relaxed">
              {searchQuery
                ? 'نتیجه‌ای متناسب با عبارت جستجو پیدا نشد.'
                : 'برای تولید کدهای ورود دوعاملی (TOTP)، حساب سازمانی یا شخصی خود را اسکن یا وارد کنید.'}
            </p>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 active:scale-95 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>افزودن نخستین حساب</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredAccounts.map((acc, index) => (
              <AccountCard
                key={acc.id}
                account={acc}
                index={index}
                totalCount={filteredAccounts.length}
                hideCodesByDefault={settings.hideCodesByDefault}
                clipboardClearSeconds={settings.clipboardClearSeconds}
                onEdit={setEditingAccount}
                onDelete={setDeletingAccount}
                onMoveUp={(a) => handleMoveAccount(a, 'up')}
                onMoveDown={(a) => handleMoveAccount(a, 'down')}
                onUpdateCounter={handleUpdateCounter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onShowToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) on mobile for quick Add Account */}
      <div className="fixed end-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] z-30 sm:hidden">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white shadow-lg shadow-[#5a1414]/35 active:scale-90 transition"
          aria-label="افزودن حساب جدید"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>

      {/* iOS Installation Guide Banner */}
      <IOSInstallGuide />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 inset-x-0 mx-auto w-max max-w-[90vw] z-50 flex items-center gap-2 rounded-full bg-[#2b1313] border border-[#5a1414]/30 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4 text-[#f2c6c6]" />
          <span>{toastMessage}</span>
        </div>
      )}

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
        onEnablePinLock={handleEnablePinLock}
        onDisablePinLock={handleDisablePinLock}
        onImportAccounts={handleImportAccounts}
        hasEncryptedVault={Boolean(encryptedPayload)}
      />
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.hash === '#app' ||
        window.location.hostname === 'appassets.androidplatform.net' ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      ) {
        return 'app';
      }
    }
    // Default directly to the Landing Page in normal browser visits
    return 'landing';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#app') {
        setCurrentView('app');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenApp = () => {
    window.location.hash = '#app';
    setCurrentView('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLanding = () => {
    window.location.hash = '#landing';
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <I18nProvider>
      {currentView === 'landing' ? (
        <LandingPage onOpenApp={handleOpenApp} />
      ) : (
        <AuthenticatorApp onOpenLanding={handleOpenLanding} />
      )}
    </I18nProvider>
  );
}
