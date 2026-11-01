import React, { useState } from 'react';
import { AlertCircle, Download, X } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

interface SecurityWarningBannerProps {
  onOpenBackup: () => void;
  accountsCount: number;
}

export const SecurityWarningBanner: React.FC<SecurityWarningBannerProps> = ({
  onOpenBackup,
  accountsCount,
}) => {
  const { t } = useI18n();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || accountsCount === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-3">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 sm:p-4 text-xs text-amber-200">
        <button
          onClick={() => setIsDismissed(true)}
          aria-label="بستن هشدار"
          className="absolute top-2.5 end-2.5 flex h-8 w-8 sm:hidden items-center justify-center rounded-lg text-amber-400/70 hover:text-amber-200 active:scale-90 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-2.5 pe-8 sm:pe-0">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300 text-xs sm:text-sm">
              {t('storageWarningTitle')}
            </p>
            <p className="text-[11px] sm:text-xs text-amber-200/80 mt-0.5 leading-relaxed">
              {t('storageWarningDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <button
            onClick={onOpenBackup}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/35 py-2.5 px-4 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 active:scale-[0.98] transition"
          >
            <Download className="h-4 w-4" />
            <span>{t('exportEncryptedBackup')}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="بستن هشدار"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-amber-400/60 hover:text-amber-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
