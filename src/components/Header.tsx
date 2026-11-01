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
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onLockVault,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        {/* Zone 1: Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {t('appName')}
          </h1>
        </div>

        {/* Zone 2: Desktop Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 ps-9 pe-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Android APK Download Direct Link */}
          <a
            href="/totp-authenticator.apk"
            download="totp-authenticator.apk"
            title="دانلود مستقیم فایل نصبی APK اندروید"
            className="flex h-10 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 text-xs font-semibold text-emerald-400 active:scale-95 transition"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden md:inline">دانلود APK</span>
          </a>

          {/* Add Account Button (Desktop CTA - mobile uses bottom FAB) */}
          <button
            type="button"
            onClick={onOpenAddModal}
            aria-label={t('addAccount')}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addAccount')}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettingsModal}
            aria-label={t('settings')}
            title={t('settings')}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-90 transition"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>

          {/* Lock Button */}
          <button
            type="button"
            onClick={onLockVault}
            aria-label={t('lockVault')}
            title={t('lockVault')}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 active:scale-90 transition"
          >
            <Lock className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="sm:hidden px-3.5 pb-2.5">
        <div className="relative w-full">
          <Search className="absolute start-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/95 py-2.5 ps-9 pe-9 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="پاک کردن جستجو"
              className="absolute end-2.5 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
