import React from 'react';
import { Trash2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-5 sm:p-6 shadow-2xl text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-3.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mb-3.5 mx-auto">
          <Trash2 className="h-7 w-7" />
        </div>

        <h3 className="text-center text-base sm:text-lg font-bold text-[#2b1313] mb-1.5">
          حذف حساب از کلیدبان
        </h3>

        <div className="rounded-xl bg-[#fcf2f2] p-3.5 my-3 text-center border border-[#efdcdc]">
          <p className="font-bold text-[#2b1313] text-sm">{account.issuer}</p>
          <p className="text-xs text-[#7b6464] mt-0.5">{account.account}</p>
        </div>

        <p className="text-xs text-[#7b6464] text-center leading-relaxed">
          با حذف این حساب، امکان تولید کدهای یک‌بارمصرف برای آن وجود نخواهد داشت مگر اینکه مجدداً کد QR آن را ثبت نمایید.
        </p>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#fcf2f2] py-3 text-xs font-semibold text-[#7b6464] hover:bg-[#f2c6c6]/50 active:scale-95 transition border border-[#efdcdc]"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(account);
              onClose();
            }}
            className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 active:scale-95 transition"
          >
            حذف قطعی
          </button>
        </div>
      </div>
    </div>
  );
};
