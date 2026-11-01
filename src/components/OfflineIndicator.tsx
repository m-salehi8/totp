import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18nContext';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { t } = useI18n();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 select-none">
      {isOnline ? t('offlineBadge') : 'بدون اینترنت'}
    </span>
  );
};
