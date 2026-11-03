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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2b1313]/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-4 sm:p-6 shadow-[0_20px_40px_-15px_rgba(90,20,20,0.2)] max-h-[92vh] sm:max-h-[90vh] flex flex-col text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#efdcdc]">
          <h2 className="text-base sm:text-lg font-bold text-[#5a1414] flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-[#5a1414]" />
            {t('settings')}
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-white hover:text-[#2b1313] active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Streamlined Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 my-3.5 rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-1 rounded-lg transition-all ${
              activeTab === 'backup'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            {t('tabBackup')}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2.5 px-1 rounded-lg transition-all ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            {t('tabSecurity')}
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-2.5 px-1 rounded-lg transition-all ${
              activeTab === 'about'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
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
                <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {backupError}
                </p>
              )}
              {backupSuccess && (
                <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  {backupSuccess}
                </p>
              )}

              {/* Export Encrypted Backup */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Download className="h-5 w-5 text-[#5a1414] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#2b1313]">
                      {t('exportEncryptedBackup')}
                    </h3>
                    <p className="text-[11px] text-[#7b6464] mt-0.5">{t('exportDesc')}</p>
                  </div>
                </div>

                <form onSubmit={handleExportBackup} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-[#2b1313] block mb-1">
                      {t('backupPassword')} *
                    </label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder={t('backupPasswordPlaceholder')}
                      required
                      className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-3 text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isExporting}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3 text-xs font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99]"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? 'در حال ایجاد فایل...' : t('downloadBackup')}</span>
                  </button>
                </form>
              </div>

              {/* Restore Backup */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Upload className="h-5 w-5 text-[#5a1414] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#2b1313]">{t('importBackup')}</h3>
                    <p className="text-[11px] text-[#7b6464] mt-0.5">{t('importDesc')}</p>
                  </div>
                </div>

                <form onSubmit={handleRestoreSubmit} className="space-y-3 pt-2">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#efdcdc] bg-white p-4 text-center">
                    <input
                      type="file"
                      id="backupFileInput"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <label
                      htmlFor="backupFileInput"
                      className="cursor-pointer rounded-full bg-[#fcf2f2] border border-[#efdcdc] px-4 py-2 text-xs font-bold text-[#5a1414] hover:bg-white transition shadow-sm"
                    >
                      {restoreFile ? restoreFile.name : t('selectBackupFile')}
                    </label>
                  </div>

                  {requiresRestorePassword && (
                    <div>
                      <label className="text-xs font-semibold text-[#2b1313] block mb-1">
                        {t('enterBackupPassword')}
                      </label>
                      <input
                        type="password"
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder={t('backupPassword')}
                        required
                        className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-3 text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:border-[#5a1414] focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!restoreFile || isRestoring}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white border border-[#efdcdc] py-3 text-xs font-bold text-[#5a1414] hover:bg-[#fffcfc] transition active:scale-[0.99] disabled:opacity-40 shadow-sm"
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
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#2b1313] flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#5a1414]" />
                  {t('changePassword')}
                </h3>

                {passError && (
                  <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {passError}
                  </p>
                )}
                {passSuccess && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    {passSuccess}
                  </p>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2b1313] block mb-1">
                      {t('currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-3 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2b1313] block mb-1">
                      {t('newPassword')} (حداقل ۸ کاراکتر)
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-3 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2b1313] block mb-1">
                      {t('confirmNewPassword')}
                    </label>
                    <input
                      type="password"
                      value={confirmNewPass}
                      onChange={(e) => setConfirmNewPass(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-3 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3 text-xs font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99]"
                  >
                    {isChangingPass ? 'در حال اعمال...' : t('changePassword')}
                  </button>
                </form>
              </div>

              {/* Auto lock options */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#2b1313]">{t('autoLock')}</h3>
                    <p className="text-[11px] text-[#7b6464] mt-0.5">قفل خودکار در صورت عدم فعالیت</p>
                  </div>
                  <select
                    value={settings.autoLockMinutes}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, autoLockMinutes: Number(e.target.value) })
                    }
                    className="rounded-xl border border-[#efdcdc] bg-white px-3 py-2 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                  >
                    <option value={0}>{t('lockImmediately')}</option>
                    <option value={1}>{t('oneMinute')}</option>
                    <option value={5}>{t('fiveMinutes')}</option>
                    <option value={15}>{t('fifteenMinutes')}</option>
                    <option value={-1}>{t('never')}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#efdcdc]">
                  <span className="text-xs text-[#2b1313]">{t('lockOnTabHidden')}</span>
                  <input
                    type="checkbox"
                    checked={settings.lockOnTabHidden}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, lockOnTabHidden: e.target.checked })
                    }
                    className="h-5 w-5 accent-[#5a1414] rounded"
                  />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#efdcdc]">
                  <span className="text-xs text-[#2b1313]">{t('hideCodesSetting')}</span>
                  <input
                    type="checkbox"
                    checked={settings.hideCodesByDefault}
                    onChange={(e) =>
                      onSaveSettings({ ...settings, hideCodesByDefault: e.target.checked })
                    }
                    className="h-5 w-5 accent-[#5a1414] rounded"
                  />
                </div>
              </div>

              {/* Biometrics */}
              <div className="flex items-center justify-between rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="h-5 w-5 text-[#5a1414] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#2b1313]">{t('biometrics')}</h3>
                    <p className="text-[11px] text-[#7b6464] mt-0.5">{t('enableBiometrics')}</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleBiometrics}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-sm ${
                    settings.biometricsEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-[#efdcdc] text-[#7b6464] hover:bg-[#fffcfc]'
                  }`}
                >
                  {settings.biometricsEnabled ? 'فعال' : 'غیرفعال'}
                </button>
              </div>

              {/* Persistent Storage */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2]/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-[#5a1414]" />
                    <h3 className="text-xs font-bold text-[#2b1313]">
                      {isStoragePersisted ? t('persistStorageSuccess') : 'حافظه دائمی غیرفعال است'}
                    </h3>
                  </div>
                  {!isStoragePersisted && (
                    <button
                      onClick={handleRequestStorage}
                      className="rounded-full bg-white border border-[#efdcdc] px-3.5 py-1.5 text-xs font-bold text-[#5a1414] hover:bg-[#fffcfc] shadow-sm"
                    >
                      {t('persistStorageRequest')}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#7b6464] leading-relaxed">
                  فعال بودن حافظه دائمی از پاک شدن ناخواسته داده‌ها در شرایط کمبود فضای حافظه جلوگیری می‌کند.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: About & Enterprise Model */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs text-[#2b1313] leading-relaxed">
              {/* Android APK Direct Download Card */}
              <div className="rounded-2xl border border-[#f2c6c6] bg-[#fcf2f2] p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7d2323] to-[#5a1414] text-white shadow-sm">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#5a1414]">
                      برنامه اندروید (فایل نصبی APK)
                    </h3>
                    <p className="text-[11px] text-[#7d2323] font-semibold mt-0.5">
                      نسخه ۱.۰.۰ · آفلاین مستقل و امن
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#7b6464] leading-relaxed">
                  فایل نصبی مستقیم APK کامپایل شده برای گوشی‌های اندرویدی. این نسخه بدون نیاز به اتصال اینترنت کار می‌کند و قابلیت اسکن سریع کد QR با دوربین گوشی را فراهم می‌سازد.
                </p>
                <a
                  href="/totp-authenticator.apk"
                  download="totp-authenticator.apk"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] hover:brightness-105 py-3 px-4 text-xs font-bold text-white shadow-md shadow-[#5a1414]/25 transition active:scale-[0.99]"
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود فایل نصبی (APK)</span>
                </a>
              </div>

              {/* Clean Enterprise About */}
              <div className="rounded-2xl border border-[#efdcdc] bg-white p-4 sm:p-5 space-y-2.5 shadow-sm">
                <h3 className="text-sm font-bold text-[#5a1414] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#5a1414]" />
                  درباره سامانه رمزساز
                </h3>
                <p className="text-xs text-[#7b6464] leading-relaxed">
                  سامانه رمزساز سازمانی کلیدبان یک ابزار امن، مستقل و آفلاین جهت تولید کدهای یکبار مصرف ورود (TOTP) است. کلیه اطلاعات به صورت رمزنگاری‌شده و صرفاً درون حافظه دستگاه شما ذخیره می‌گردد و هیچ تبادل داده‌ای با سرورهای خارجی صورت نمی‌گیرد.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
