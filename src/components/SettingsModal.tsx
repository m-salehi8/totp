import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Shield,
  Fingerprint,
  KeyRound,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Copy,
  Check,
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
  onEnablePinLock?: (pin: string) => Promise<void>;
  onDisablePinLock?: (currentPin: string) => Promise<boolean>;
  onImportAccounts: (imported: OtpAccount[]) => void;
  hasEncryptedVault?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  accounts,
  onChangeMasterPassword,
  onEnablePinLock,
  onDisablePinLock,
  onImportAccounts,
  hasEncryptedVault = false,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'backup' | 'security' | 'about'>('backup');

  // Change / Set PIN states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isProcessingPin, setIsProcessingPin] = useState(false);

  // Backup states
  const [backupPassword, setBackupPassword] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [backupJsonString, setBackupJsonString] = useState('');
  const [isCopiedString, setIsCopiedString] = useState(false);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreText, setRestoreText] = useState('');
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

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (newPin.length < 4) {
      setPinError('پین‌کد یا گذرواژه باید حداقل ۴ کاراکتر باشد');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('تکرار پین‌کد با رمز جدید همخوانی ندارد');
      return;
    }

    setIsProcessingPin(true);
    try {
      if (hasEncryptedVault) {
        const ok = await onChangeMasterPassword(currentPin, newPin);
        if (ok) {
          setPinSuccess('پین‌کد با موفقیت تغییر یافت');
          setCurrentPin('');
          setNewPin('');
          setConfirmNewPin('');
        } else {
          setPinError('پین‌کد فعلی اشتباه است');
        }
      } else if (onEnablePinLock) {
        await onEnablePinLock(newPin);
        setPinSuccess('قفل پین‌کد با موفقیت فعال و گاوصندوق رمزنگاری شد');
        setNewPin('');
        setConfirmNewPin('');
      }
    } catch (err: any) {
      setPinError(err.message || 'خطا در تغییر پین‌کد');
    } finally {
      setIsProcessingPin(false);
    }
  };

  const handleDisablePin = async () => {
    if (!onDisablePinLock) return;
    setPinError('');
    setPinSuccess('');

    if (!currentPin) {
      setPinError('لطفاً پین‌کد فعلی را برای غیرفعال‌سازی وارد نمایید');
      return;
    }

    setIsProcessingPin(true);
    try {
      const ok = await onDisablePinLock(currentPin);
      if (ok) {
        setPinSuccess('قفل پین‌کد غیرفعال شد. حساب‌ها در فضای محلی امن ذخیره می‌شوند');
        setCurrentPin('');
      } else {
        setPinError('پین‌کد واردشده اشتباه است');
      }
    } catch (err: any) {
      setPinError(err.message || 'خطا در غیرفعال‌سازی قفل');
    } finally {
      setIsProcessingPin(false);
    }
  };

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupError('');
    setBackupSuccess('');
    setBackupJsonString('');

    if (backupPassword.length < 6) {
      setBackupError('گذرواژه فایل پشتیبان باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setIsExporting(true);
    try {
      const backupJson = await createEncryptedBackup(accounts, backupPassword);
      setBackupJsonString(backupJson);
      const filename = getJalaliBackupFilename(new Date());

      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccess(`فایل پشتیبان «${filename}» ایجاد و دانلود شد.`);
      setBackupPassword('');
    } catch (err: any) {
      setBackupError(err.message || 'خطا در تهیه نسخه پشتیبان');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyBackupString = async () => {
    if (!backupJsonString) return;
    try {
      await navigator.clipboard.writeText(backupJsonString);
      setIsCopiedString(true);
      setTimeout(() => setIsCopiedString(false), 2000);
    } catch {}
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
        setRestoreText(text);
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
    const rawData = restoreText.trim();
    if (!rawData) {
      setBackupError('لطفاً یک فایل پشتیبان انتخاب کنید یا متن رمزگذاری‌شده را الصاق نمایید');
      return;
    }
    setBackupError('');
    setBackupSuccess('');
    setIsRestoring(true);

    try {
      const detected = importUniversal(rawData);

      if (detected.type === 'kelidban' && detected.rawKelidban?.ciphertext) {
        if (!restorePassword) {
          setBackupError('برای رمزگشایی فایل پشتیبان، گذرواژه فایل را وارد نمایید');
          setIsRestoring(false);
          return;
        }
        const restored = await restoreEncryptedBackup(rawData, restorePassword);
        onImportAccounts(restored);
        setBackupSuccess(`${restored.length} حساب با موفقیت بازیابی شد.`);
      } else if (detected.accounts && detected.accounts.length > 0) {
        onImportAccounts(detected.accounts);
        setBackupSuccess(`${detected.accounts.length} حساب با موفقیت بازیابی شد.`);
      } else {
        setBackupError('هیچ حسابی در این داده شناسایی نشد.');
      }

      setRestoreFile(null);
      setRestoreText('');
      setRestorePassword('');
      setRequiresRestorePassword(false);
    } catch (err: any) {
      setBackupError(err.message || 'خطا در بازیابی پشتیبان');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-4 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#efdcdc]">
          <h2 className="text-base sm:text-lg font-bold text-[#2b1313] flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-[#5a1414]" />
            تنظیمات و پشتیبان‌گیری
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-[#f2c6c6]/50 hover:text-[#2b1313] active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 my-3.5 rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">پشتیبان‌گیری</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate">امنیت و پین‌کد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'about'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <HardDrive className="h-4 w-4 shrink-0" />
            <span className="truncate">ذخیره‌سازی</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* TAB 1: Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {backupSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{backupSuccess}</span>
                </div>
              )}

              {backupError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{backupError}</span>
                </div>
              )}

              {/* Export Encrypted Backup */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-[#5a1414]" />
                  <h3 className="text-sm font-bold text-[#2b1313]">خروجی نسخه پشتیبان رمزگذاری‌شده</h3>
                </div>
                <p className="text-xs text-[#7b6464] mb-3 leading-relaxed">
                  از آنجا که در آیفون در صورت حذف آیکون PWA حافظه IndexedDB پاک می‌شود، حتماً از حساب‌های خود پشتیبان تهیه نمایید.
                </p>

                <form onSubmit={handleExportBackup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                      گذرواژه فایل پشتیبان (جهت قفل با AES-256)
                    </label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2.5 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isExporting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>{isExporting ? 'در حال تهیه...' : 'دانلود فایل پشتیبان (JSON)'}</span>
                    </button>

                    {backupJsonString && (
                      <button
                        type="button"
                        onClick={handleCopyBackupString}
                        className="flex items-center gap-1.5 rounded-xl border border-[#efdcdc] bg-white px-3 py-2.5 text-xs font-semibold text-[#2b1313] hover:bg-[#fcf2f2] transition"
                        title="کپی متن پشتیبان"
                      >
                        {isCopiedString ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[#7b6464]" />}
                        <span>{isCopiedString ? 'کپی شد' : 'کپی متن'}</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Import / Restore Backup */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-4 w-4 text-[#5a1414]" />
                  <h3 className="text-sm font-bold text-[#2b1313]">بازیابی از فایل پشتیبان</h3>
                </div>
                <p className="text-xs text-[#7b6464] mb-3 leading-relaxed">
                  فایل پشتیبان کلیدبان یا فرمت‌های استاندارد Aegis و 2FAS را انتخاب یا در کادر زیر جای‌گذاری کنید.
                </p>

                <form onSubmit={handleRestoreSubmit} className="space-y-3">
                  <div>
                    <label className="cursor-pointer block rounded-xl border-2 border-dashed border-[#efdcdc] bg-white p-3 text-center hover:border-[#5a1414] transition">
                      <span className="text-xs font-semibold text-[#5a1414]">
                        {restoreFile ? restoreFile.name : 'انتخاب فایل پشتیبان (.json)'}
                      </span>
                      <input
                        type="file"
                        accept=".json,application/json,text/plain"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  <div>
                    <textarea
                      value={restoreText}
                      onChange={(e) => {
                        setRestoreText(e.target.value);
                        try {
                          const res = importUniversal(e.target.value);
                          setRequiresRestorePassword(res.type === 'kelidban' && Boolean(res.rawKelidban?.ciphertext));
                        } catch {
                          setRequiresRestorePassword(false);
                        }
                      }}
                      placeholder="یا متن پشتیبان رمزنگاری‌شده را اینجا الصاق کنید..."
                      rows={3}
                      dir="ltr"
                      className="w-full rounded-xl border border-[#efdcdc] bg-white p-2.5 text-[11px] font-mono text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                    />
                  </div>

                  {requiresRestorePassword && (
                    <div>
                      <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                        گذرواژه تعیین‌شده هنگام تهیه پشتیبان
                      </label>
                      <input
                        type="password"
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder="گذرواژه فایل را وارد کنید"
                        required
                        className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2.5 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRestoring || !restoreText}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{isRestoring ? 'در حال بازیابی...' : 'بازیابی و افزودن حساب‌ها'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Security & PIN */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {pinSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              {pinError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* PIN Lock Management */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasEncryptedVault ? (
                      <Lock className="h-5 w-5 text-[#5a1414]" />
                    ) : (
                      <Unlock className="h-5 w-5 text-[#7b6464]" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-[#2b1313]">قفل با پین‌کد / رمز عبور</h3>
                      <p className="text-[11px] text-[#7b6464]">
                        {hasEncryptedVault
                          ? 'فعال است — کلیدها با AES-256 و مشتق‌سازی PBKDF2 رمزنگاری شده‌اند'
                          : 'غیرفعال است — حساب‌ها بدون رمز در دسترس قرار دارند'}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleChangePinSubmit} className="space-y-3 pt-2 border-t border-[#efdcdc]">
                  {hasEncryptedVault && (
                    <div>
                      <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                        پین‌کد فعلی
                      </label>
                      <input
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="پین‌کد کنونی را وارد کنید"
                        className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2.5 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                        {hasEncryptedVault ? 'پین‌کد جدید' : 'تعیین پین‌کد امنیتی'}
                      </label>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="حداقل ۴ رقم"
                        required
                        className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2.5 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                        تکرار پین‌کد
                      </label>
                      <input
                        type="password"
                        value={confirmNewPin}
                        onChange={(e) => setConfirmNewPin(e.target.value)}
                        placeholder="تکرار پین‌کد"
                        required
                        className="w-full rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2.5 text-xs text-[#2b1313] focus:border-[#5a1414] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isProcessingPin}
                      className="flex-1 rounded-xl bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                    >
                      {hasEncryptedVault ? 'تغییر پین‌کد' : 'فعال‌سازی قفل امنیتی'}
                    </button>

                    {hasEncryptedVault && onDisablePinLock && (
                      <button
                        type="button"
                        onClick={handleDisablePin}
                        disabled={isProcessingPin}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                      >
                        غیرفعال‌سازی قفل
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Behavior Settings */}
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#2b1313]">تنظیمات رفتاری</h4>

                <label className="flex items-center justify-between text-xs text-[#2b1313] cursor-pointer">
                  <span>قفل خودکار با مخفی شدن تب یا بستن مرورگر</span>
                  <input
                    type="checkbox"
                    checked={settings.lockOnTabHidden}
                    onChange={(e) => onSaveSettings({ ...settings, lockOnTabHidden: e.target.checked })}
                    className="h-4 w-4 rounded border-[#efdcdc] text-[#5a1414] focus:ring-[#f2c6c6]"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-[#2b1313] cursor-pointer">
                  <span>پنهان‌سازی پیش‌فرض ارقام (نیاز به لمس برای نمایش)</span>
                  <input
                    type="checkbox"
                    checked={settings.hideCodesByDefault}
                    onChange={(e) => onSaveSettings({ ...settings, hideCodesByDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-[#efdcdc] text-[#5a1414] focus:ring-[#f2c6c6]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Storage & Offline Architecture */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs leading-relaxed text-[#2b1313]">
              <div className="rounded-2xl border border-[#efdcdc] bg-[#fcf2f2] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-[#5a1414]" />
                    <span className="font-bold text-[#2b1313]">وضعیت حافظه پایدار IndexedDB</span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      isStoragePersisted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isStoragePersisted ? 'پایدار و ماندگار' : 'استاندارد مرورگر'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7b6464]">
                  برای جلوگیری از پاکسازی خودکار حافظه کش توسط سافاری در آیفون، درخواست حافظه ماندگار (Storage Persistence) ثبت می‌شود.
                </p>
                {!isStoragePersisted && (
                  <button
                    onClick={handleRequestStorage}
                    className="rounded-xl bg-white border border-[#efdcdc] px-3.5 py-2 text-xs font-bold text-[#5a1414] hover:bg-[#fcf2f2] transition"
                  >
                    ثبت درخواست حافظه پایدار (Persist)
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-[#efdcdc] bg-white p-4 space-y-2">
                <h4 className="font-bold text-[#2b1313]">استانداردها و امنیت</h4>
                <ul className="list-disc list-inside space-y-1 text-[#7b6464]">
                  <li>استاندارد جهانی RFC 6238 برای تولید کدهای زمان‌دار TOTP</li>
                  <li>استاندارد RFC 4648 برای رمزگشایی و اعتبارسنجی Base32</li>
                  <li>استفاده ۱۰۰٪ از Web Crypto API بومی مرورگر (`window.crypto.subtle`)</li>
                  <li>رمزنگاری AES-256-GCM به همراه مشتق‌سازی امن کلید PBKDF2</li>
                  <li>عملکرد کاملاً آفلاین و قابل استفاده در حالت پرواز (Airplane Mode)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
