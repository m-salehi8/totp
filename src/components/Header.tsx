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
  hasPinLock?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onLockVault,
  onOpenLanding,
  hasPinLock = false,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-[#efdcdc] bg-[#fffcfc]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        {/* Brand */}
        <div
          onClick={onOpenLanding}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          title="معرفی کلیدبان"
        >
          <div className="flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white shadow-md shadow-[#5a1414]/25 group-hover:scale-105 transition">
            <Shield className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#2b1313] tracking-tight leading-tight">
              {t('appName')}
            </h1>
            <span className="text-[10px] text-[#7b6464] block sm:hidden">رمزساز دوعاملی آفلاین</span>
          </div>
        </div>

        {/* Desktop Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-[#7b6464] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] py-2 ps-9 pe-4 text-xs text-[#2b1313] placeholder-[#7b6464]/70 focus:bg-white focus:border-[#5a1414] focus:ring-1 focus:ring-[#f2c6c6] focus:outline-none transition shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[#7b6464] hover:text-[#2b1313]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Landing Guide Link */}
          {onOpenLanding && (
            <button
              type="button"
              onClick={onOpenLanding}
              title="صفحه معرفی و راهنما"
              className="flex h-11 sm:h-9 items-center justify-center gap-1.5 rounded-full border border-[#efdcdc] bg-white hover:bg-[#fcf2f2] px-3 text-xs font-semibold text-[#7b6464] hover:text-[#5a1414] active:scale-95 transition shadow-sm"
            >
              <span>راهنما</span>
            </button>
          )}

          {/* Direct APK Link */}
          <a
            href="/totp-authenticator.apk"
            download="totp-authenticator.apk"
            title="دانلود مستقیم فایل نصبی APK اندروید"
            className="flex h-11 sm:h-9 items-center justify-center gap-1.5 rounded-full border border-[#f2c6c6] bg-white hover:bg-[#fcf2f2] px-3.5 text-xs font-bold text-[#5a1414] active:scale-95 transition shadow-sm"
          >
            <Smartphone className="h-4 w-4 text-[#5a1414]" />
            <span className="hidden md:inline">دانلود APK</span>
          </a>

          {/* Add Account Desktop CTA */}
          <button
            type="button"
            onClick={onOpenAddModal}
            aria-label={t('addAccount')}
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5a1414]/20 hover:brightness-105 transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.4]" />
            <span>{t('addAccount')}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettingsModal}
            aria-label={t('settings')}
            title={t('settings')}
            className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-[#7b6464] hover:text-[#2b1313] hover:bg-[#fcf2f2] active:scale-90 transition shadow-sm"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>

          {/* Lock Button (if PIN lock is enabled) */}
          {hasPinLock && (
            <button
              type="button"
              onClick={onLockVault}
              aria-label={t('lockVault')}
              title={t('lockVault')}
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-[#7b6464] hover:text-[#5a1414] hover:bg-[#fcf2f2] active:scale-90 transition shadow-sm"
            >
              <Lock className="h-4.5 w-4.5" />
            </button>
          )}
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
            className="w-full rounded-xl border border-[#efdcdc] bg-white py-3 ps-10 pe-10 text-sm text-[#2b1313] placeholder-[#7b6464]/70 focus:border-[#5a1414] focus:ring-1 focus:ring-[#f2c6c6] focus:outline-none transition-colors shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="پاک کردن جستجو"
              className="absolute end-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#7b6464] hover:text-[#2b1313] active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
