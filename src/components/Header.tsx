import React from 'react';
import {
  Shield,
  Search,
  Plus,
  Settings as SettingsIcon,
  Lock,
  X,
  Smartphone,
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onLockVault: () => void;
  onOpenLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onLockVault,
  onOpenLanding,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-[#efdcdc] bg-[#fffcfc]/90 backdrop-blur-xl shadow-[0_1px_0_#efdcdc]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        {/* Zone 1: Brand (clickable to return to landing) */}
        <div
          onClick={onOpenLanding}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          title="بازگشت به صفحه معرفی"
        >
          <div className="flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white shadow-md shadow-[#5a1414]/30 group-hover:scale-105 transition">
            <Shield className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#5a1414] tracking-tight leading-tight">
              {t('appName')}
            </h1>
            <span className="text-[10px] text-[#7b6464] block sm:hidden">ورود دو مرحله‌ای</span>
          </div>
        </div>

        {/* Zone 2: Desktop Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-[#7b6464] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] py-2 ps-9 pe-4 text-xs text-[#2b1313] placeholder-[#7b6464]/65 focus:bg-white focus:border-[#5a1414] focus:outline-none transition shadow-inner"
            />
          </div>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Home / Landing Navigation Link */}
          {onOpenLanding && (
            <button
              type="button"
              onClick={onOpenLanding}
              title="صفحه معرفی و راهنما"
              className="flex h-11 sm:h-9 items-center justify-center gap-1.5 rounded-full border border-[#efdcdc] bg-white hover:bg-[#fcf2f2] px-3 text-xs font-semibold text-[#7b6464] hover:text-[#5a1414] active:scale-95 transition shadow-sm"
            >
              <span>معرفی</span>
            </button>
          )}

          {/* Android APK Download Direct Link */}
          <a
            href="/totp-authenticator.apk"
            download="totp-authenticator.apk"
            title="دانلود مستقیم فایل نصبی APK اندروید"
            className="flex h-11 sm:h-9 items-center justify-center gap-1.5 rounded-full border border-[#f2c6c6] bg-white hover:bg-[#fcf2f2] px-3.5 text-xs font-bold text-[#5a1414] active:scale-95 transition shadow-sm"
          >
            <Smartphone className="h-4 w-4 text-[#5a1414]" />
            <span className="hidden md:inline">دانلود APK</span>
          </a>

          {/* Add Account Button (Desktop CTA - mobile uses bottom FAB) */}
          <button
            type="button"
            onClick={onOpenAddModal}
            aria-label={t('addAccount')}
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5a1414]/30 hover:brightness-105 transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.4]" />
            <span>{t('addAccount')}</span>
          </button>

          {/* Settings Button (Touch friendly) */}
          <button
            type="button"
            onClick={onOpenSettingsModal}
            aria-label={t('settings')}
            title={t('settings')}
            className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-[#7b6464] hover:text-[#5a1414] hover:bg-[#fcf2f2] active:scale-90 transition shadow-sm"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>

          {/* Lock Button (Touch friendly) */}
          <button
            type="button"
            onClick={onLockVault}
            aria-label={t('lockVault')}
            title={t('lockVault')}
            className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-[#7b6464] hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition shadow-sm"
          >
            <Lock className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="sm:hidden px-3.5 pb-2.5">
        <div className="relative w-full">
          <Search className="absolute start-3.5 top-3.5 h-4 w-4 text-[#7b6464] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] py-3 ps-10 pe-10 text-sm text-[#2b1313] placeholder-[#7b6464]/65 focus:bg-white focus:border-[#5a1414] focus:outline-none transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="پاک کردن جستجو"
              className="absolute end-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#7b6464] hover:text-[#5a1414] active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
