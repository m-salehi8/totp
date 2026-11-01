import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Shield,
  Fingerprint,
  KeyRound,
  Download,
  Upload,
  AlertTriangle,
  HardDrive,
  EyeOff,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import type { AppSettings, OtpAccount } from '../domain/types';
import { useI18n } from '../i18n/i18nContext';
import { getJalaliBackupFilename } from '../domain/jalaali';
import { createEncryptedBackup, restoreEncryptedBackup } from '../crypto/backupCrypto';
import { importUniversal } from '../crypto/importParsers';
import { requestPersistentStorage } from '../storage/db';
import { registerWebAuthnBiometric } from '../crypto/webauthn';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  accounts: OtpAccount[];
  onChangeMasterPassword: (oldPass: string, newPass: string) => Promise<boolean>;
  onImportAccounts: (imported: OtpAccount[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  accounts,
  onChangeMasterPassword,
  onImportAccounts,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'backup' | 'security' | 'about'>('backup');

  // Change password states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Backup states
  const [backupPassword, setBackupPassword] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [requiresRestorePassword, setRequiresRestorePassword] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Storage Persistence state
  const [isStoragePersisted, setIsStoragePersisted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStorage();
    }
  }, [isOpen]);

  const checkStorage = async () => {
    const res = await requestPersistentStorage();
    setIsStoragePersisted(res.persisted);
  };

  const handleRequestStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      setIsStoragePersisted(granted);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPass.length < 8) {
      setPassError(t('passwordTooShort'));
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassError(t('passwordsDoNotMatch'));
      return;
    }

    setIsChangingPass(true);
    try {
      const ok = await onChangeMasterPassword(currentPass, newPass);
      if (ok) {
        setPassSuccess(t('passwordChangedSuccess'));
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
      } else {
        setPassError(t('incorrectPassword'));
      }
    } catch (err: any) {
      setPassError(err.message || 'خطا در تغییر گذرواژه');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupError('');
    setBackupSuccess('');

    if (backupPassword.length < 6) {
      setBackupError('گذرواژه فایل پشتیبان باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setIsExporting(true);
    try {
      const backupJson = await createEncryptedBackup(accounts, backupPassword);
      const filename = getJalaliBackupFilename(new Date());

      const blob = new Blob([backupJson], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccess(`فایل پشتیبان «${filename}» با موفقیت ذخیره شد.`);
      setBackupPassword('');
    } catch (err: any) {
      setBackupError(err.message || 'خطا در تهیه نسخه پشتیبان');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setBackupError('');
    setBackupSuccess('');

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const res = importUniversal(text);
        if (res.type === 'kelidban' && res.rawKelidban?.ciphertext) {
          setRequiresRestorePassword(true);
        } else {
          setRequiresRestorePassword(false);
        }
      } catch {
        setRequiresRestorePassword(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;
    setBackupError('');
    setBackupSuccess('');
    setIsRestoring(true);

    try {
      const text = await restoreFile.text();
      const detected = importUniversal(text);

      if (detected.type === 'kelidban' && detected.rawKelidban?.ciphertext) {
        if (!restorePassword) {
          setBackupError(t('enterBackupPassword'));
          setIsRestoring(false);
          return;
        }
        const restored = await restoreEncryptedBackup(text, restorePassword);
        onImportAccounts(restored);
        setBackupSuccess(`${restored.length} ${t('importSuccess')}`);
      } else if (detected.accounts && detected.accounts.length > 0) {
        onImportAccounts(detected.accounts);
        setBackupSuccess(`${detected.accounts.length} ${t('importSuccess')}`);
      } else {
        setBackupError('هیچ حسابی در این فایل شناسایی نشد.');
      }

      setRestoreFile(null);
      setRestorePassword('');
      setRequiresRestorePassword(false);
    } catch (err: any) {
      setBackupError(err.message || 'خطا در بازیابی فایل');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleToggleBiometrics = async () => {
    if (!settings.biometricsEnabled) {
      try {
        const res = await registerWebAuthnBiometric();
        onSaveSettings({
          ...settings,
          biometricsEnabled: true,
          webauthnCredentialId: res.credentialId,
        });
      } catch (err: any) {
        alert(err.message || t('biometricsNotSupported'));
      }
    } else {
      onSaveSettings({
        ...settings,
        biometricsEnabled: false,
        webauthnCredentialId: undefined,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl rounded-t-[28px] sm:rounded-3xl border-t sm:border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-indigo-400" />
            {t('settings')}
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Streamlined Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 my-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-1 rounded-lg transition-all ${
              activeTab === 'backup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabBackup')}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 rounded-lg transition-all ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabSecurity')}
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-2 px-1 rounded-lg transition-all ${
              activeTab === 'about'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabAbout')}
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto flex-1 pe-1 space-y-4">
          {/* TAB 1: Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {backupError && (
                <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {backupError}
                </p>
              )}
              {backupSuccess && (
                <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  {backupSuccess}
                </p>
              )}

              {/* Export Encrypted Backup */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Download className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {t('exportEncryptedBackup')}
                    </h3>
                    <p className="text-[11px] text-slate-400">{t('exportDesc')}</p>
                  </div>
                </div>

                <form onSubmit={handleExportBackup} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      {t('backupPassword')} *
                    </label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder={t('backupPasswordPlaceholder')}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isExporting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition active:scale-[0.99]"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? 'در حال ایجاد فایل...' : t('downloadBackup')}</span>
                  </button>
                </form>
              </div>

              {/* Restore Backup */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Upload className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{t('importBackup')}</h3>
                    <p className="text-[11px] text-slate-400">{t('importDesc')}</p>
                  </div>
                </div>

                <form onSubmit={handleRestoreSubmit} className="space-y-3 pt-2">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-4 text-center">
                    <input
                      type="file"
                      id="backupFileInput"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <label
                      htmlFor="backupFileInput"
                      className="cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      {restoreFile ? restoreFile.name : t('selectBackupFile')}
                    </label>
                  </div>

                  {requiresRestorePassword && (
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">
                        {t('enterBackupPassword')}
                      </label>
                      <input
                        type="password"
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder={t('backupPassword')}
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!restoreFile || isRestoring}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition active:scale-[0.99] disabled:opacity-40"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{isRestoring ? 'در حال بازیابی...' : t('restoreButton')}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Change Master Password Form */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-400" />
                  {t('changePassword')}
                </h3>

                {passError && (
                  <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {passError}
                  </p>
                )}
                {passSuccess && (
                  <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    {passSuccess}
                  </p>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-2.5">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {t('currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {t('newPassword')} (حداقل ۸ کاراکتر)
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {t('confirmNewPassword')}
                    </label>
                    <input
                      type="password"
                      value={confirmNewPass}
                      onChange={(e) => setConfirmNewPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition active:scale-[0.99]"
                  >
                    {isChangingPass ? 'در حال اعمال...' : t('changePassword')}
                  </button>
                </form>
              </div>

              {/* Auto lock options */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{t('autoLock')}</h3>
                    <p className="text-[11px] text-slate-400">قفل خودکار در صورت عدم فعالیت</p>
                  </div>
                  <select
                    value={settings.autoLockMinutes}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, autoLockMinutes: Number(e.target.value) })
                    }
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={0}>{t('lockImmediately')}</option>
                    <option value={1}>{t('oneMinute')}</option>
                    <option value={5}>{t('fiveMinutes')}</option>
                    <option value={15}>{t('fifteenMinutes')}</option>
                    <option value={-1}>{t('never')}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                  <span className="text-xs text-slate-300">{t('lockOnTabHidden')}</span>
                  <input
                    type="checkbox"
                    checked={settings.lockOnTabHidden}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, lockOnTabHidden: e.target.checked })
                    }
                    className="h-4.5 w-4.5 accent-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                  <span className="text-xs text-slate-300">{t('hideCodesSetting')}</span>
                  <input
                    type="checkbox"
                    checked={settings.hideCodesByDefault}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, hideCodesByDefault: e.target.checked })
                    }
                    className="h-4.5 w-4.5 accent-indigo-600 rounded"
                  />
                </div>
              </div>

              {/* Biometrics */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{t('biometrics')}</h3>
                    <p className="text-[11px] text-slate-400">{t('enableBiometrics')}</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleBiometrics}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    settings.biometricsEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {settings.biometricsEnabled ? 'فعال' : 'غیرفعال'}
                </button>
              </div>

              {/* Persistent Storage */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-xs font-semibold text-slate-200">
                      {isStoragePersisted ? t('persistStorageSuccess') : 'حافظه دائمی غیرفعال است'}
                    </h3>
                  </div>
                  {!isStoragePersisted && (
                    <button
                      onClick={handleRequestStorage}
                      className="rounded-lg bg-indigo-600/30 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/50"
                    >
                      {t('persistStorageRequest')}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{t('storageWarningDesc')}</p>
              </div>
            </div>
          )}

          {/* TAB 3: About & Security Model */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              {/* Android APK Direct Download Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      برنامه اندروید (فایل نصبی APK)
                    </h3>
                    <p className="text-[11px] text-emerald-400/90 font-medium">
                      نسخه ۱.۰.۰ · حجم ۳.۰ مگابایت · آفلاین مستقل
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  فایل نصبی مستقیم APK کامپایل شده برای گوشی‌های اندرویدی. این نسخه کاملاً آفلاین کار می‌کند، به اینترنت نیاز ندارد و دسترسی اسکن بارکد با دوربین را فراهم می‌سازد.
                </p>
                <a
                  href="/totp-authenticator.apk"
                  download="totp-authenticator.apk"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 text-xs font-bold text-white shadow-md transition active:scale-[0.99]"
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود فایل نصبی (APK)</span>
                </a>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  {t('about')}
                </h3>
                <p>{t('aboutText')}</p>
                <div className="pt-2 text-[11px] text-slate-400 space-y-1.5">
                  <p>• استانداردهای پیاده‌سازی شده: RFC 6238 (TOTP) و RFC 4226 (HOTP)</p>
                  <p>• رمزنگاری: AES-256-GCM با Salt تصادفی و Nonce یک‌بارمصرف ۱۲ بایتی</p>
                  <p>• مشتق‌گیری کلید: PBKDF2 با بیش از ۶۰۰,۰۰۰ دور و الگوریتم SHA-256</p>
                  <p>• ذخیره‌سازی: پایگاه داده محلی IndexedDB روی مرورگر بدون هیچ سرور خارجی</p>
                  <p className="font-semibold text-indigo-400 pt-1">{t('license')}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  {t('securityModelTitle')}
                </h3>
                <p className="text-slate-300">{t('securityModelDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
