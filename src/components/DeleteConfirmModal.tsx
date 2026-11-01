import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { OtpAccount } from '../domain/types';
import { useI18n } from '../i18n/i18nContext';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  account: OtpAccount | null;
  onClose: () => void;
  onConfirm: (acc: OtpAccount) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  account,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-t-[28px] sm:rounded-3xl border-t sm:border border-rose-500/30 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mb-3 mx-auto">
          <Trash2 className="h-6 w-6" />
        </div>

        <h3 className="text-center text-base sm:text-lg font-bold text-white mb-1.5">
          {t('deleteConfirmTitle')}
        </h3>

        <div className="rounded-xl bg-slate-950 p-3 my-3 text-center border border-slate-800">
          <p className="font-semibold text-slate-200">{account.issuer}</p>
          <p className="text-xs text-slate-400">{account.account}</p>
        </div>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          {t('deleteConfirmDesc')}
        </p>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-800 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-700 active:scale-95 transition"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(account);
              onClose();
            }}
            className="flex-1 rounded-xl bg-rose-600 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 active:scale-95 transition"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
