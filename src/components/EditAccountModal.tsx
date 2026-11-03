import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle } from 'lucide-react';
import type { HashAlgorithm, OtpAccount, OtpType } from '../domain/types';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2b1313]/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-4 sm:p-6 shadow-[0_20px_40px_-15px_rgba(90,20,20,0.2)] text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        <div className="flex items-center justify-between pb-3.5 border-b border-[#efdcdc]">
          <h2 className="text-base sm:text-lg font-bold text-[#5a1414] flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[#5a1414]" />
            {t('editAccount')}
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-white hover:text-[#2b1313] active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1">
              {t('issuer')}
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1">
              {t('accountName')}
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                {t('algorithm')}
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as HashAlgorithm)}
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-2.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
              >
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                {t('digits')}
              </label>
              <select
                value={digits}
                onChange={(e) => setDigits(Number(e.target.value))}
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-2.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
              >
                <option value={6}>6 رقم</option>
                <option value={8}>8 رقم</option>
              </select>
            </div>
          </div>

          {account.type === 'totp' ? (
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                {t('period')}
              </label>
              <input
                type="number"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                {t('counter')}
              </label>
              <input
                type="number"
                value={counter}
                onChange={(e) => setCounter(Number(e.target.value))}
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl px-4 py-3 sm:py-2 text-xs font-semibold text-[#7b6464] hover:bg-[#fcf2f2] active:scale-95 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-6 py-3.5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 active:scale-95 transition"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
