import React, { useState, useEffect } from 'react';
import { Edit3, X } from 'lucide-react';
import type { HashAlgorithm, OtpAccount } from '../domain/types';
import { useI18n } from '../i18n/i18nContext';

interface EditAccountModalProps {
  isOpen: boolean;
  account: OtpAccount | null;
  onClose: () => void;
  onSave: (updated: OtpAccount) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  account,
  onClose,
  onSave,
}) => {
  const { t } = useI18n();
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [counter, setCounter] = useState<number>(0);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-1');

  useEffect(() => {
    if (account) {
      setIssuer(account.issuer || '');
      setAccountName(account.account || '');
      setDigits(account.digits || 6);
      setPeriod(account.period || 30);
      setCounter(account.counter || 0);
      setAlgorithm(account.algorithm || 'SHA-1');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...account,
      issuer: issuer.trim() || 'Account',
      account: accountName.trim() || 'User',
      digits,
      period,
      counter,
      algorithm,
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-4 sm:p-6 shadow-2xl text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#efdcdc]">
          <h2 className="text-base sm:text-lg font-bold text-[#2b1313] flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[#5a1414]" />
            {t('editAccount')}
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-[#f2c6c6]/50 hover:text-[#2b1313] active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1">
              نام سامانه (Issuer)
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1">
              نام حساب / کاربری
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                تعداد ارقام
              </label>
              <select
                value={digits}
                onChange={(e) => setDigits(Number(e.target.value))}
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3 py-2.5 text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
              >
                <option value={6}>۶ رقم</option>
                <option value={8}>۸ رقم</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                {account.type === 'totp' ? 'بازه زمانی (ثانیه)' : 'مقدار شمارنده'}
              </label>
              {account.type === 'totp' ? (
                <input
                  type="number"
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3 py-2 text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
                />
              ) : (
                <input
                  type="number"
                  value={counter}
                  onChange={(e) => setCounter(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3 py-2 text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#efdcdc] bg-white py-3 text-xs font-bold text-[#7b6464] hover:bg-[#fcf2f2] transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition"
            >
              ذخیره تغییرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
