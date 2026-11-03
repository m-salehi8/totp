import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import type { OtpAccount } from '../domain/types';
import { formatOtpCode, generateHotp, generateTotp, getRemainingSeconds } from '../domain/totp';
import { CountdownRing } from './CountdownRing';
import { useI18n } from '../i18n/i18nContext';

interface AccountCardProps {
  account: OtpAccount;
  index: number;
  totalCount: number;
  hideCodesByDefault: boolean;
  clipboardClearSeconds: number;
  onEdit: (acc: OtpAccount) => void;
  onDelete: (acc: OtpAccount) => void;
  onMoveUp: (acc: OtpAccount) => void;
  onMoveDown: (acc: OtpAccount) => void;
  onUpdateCounter: (acc: OtpAccount, newCounter: number) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onShowToast?: (message: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  index,
  totalCount,
  hideCodesByDefault,
  clipboardClearSeconds,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateCounter,
  onDragStart,
  onDragOver,
  onDrop,
  onShowToast,
}) => {
  const { t } = useI18n();
  const [currentCode, setCurrentCode] = useState<string>('------');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(account.period || 30);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(!hideCodesByDefault);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [isGeneratingHotp, setIsGeneratingHotp] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const clipboardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsRevealed(!hideCodesByDefault);
  }, [hideCodesByDefault]);

  // Click outside to close actions menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Real-time TOTP loop
  useEffect(() => {
    if (account.type === 'hotp') {
      generateHotp(account.secret, account.counter || 0, {
        algorithm: account.algorithm,
        digits: account.digits,
      }).then(setCurrentCode);
      return;
    }

    let isMounted = true;
    const period = account.period || 30;

    const updateCodes = async () => {
      if (!isMounted) return;
      const now = Date.now();
      const remaining = getRemainingSeconds(period, 0, now);
      setRemainingSeconds(remaining);

      try {
        const code = await generateTotp(account.secret, {
          algorithm: account.algorithm,
          digits: account.digits,
          period,
          timestampMs: now,
        });

        if (isMounted) {
          setCurrentCode(code);
        }
      } catch (err) {
        console.error('Failed to generate TOTP code:', err);
      }
    };

    updateCodes();
    const interval = setInterval(updateCodes, 250);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account]);

  // Copy code with tactile vibration, toast, and auto-clear
  const handleCopyCode = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentCode || currentCode === '------') return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentCode);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      setIsCopied(true);
      onShowToast?.('کد کپی شد');
      setTimeout(() => setIsCopied(false), 2000);

      if (clipboardClearSeconds > 0) {
        if (clipboardTimerRef.current) {
          clearTimeout(clipboardTimerRef.current);
        }
        clipboardTimerRef.current = window.setTimeout(async () => {
          try {
            const currentClip = await navigator.clipboard.readText();
            if (currentClip === currentCode) {
              await navigator.clipboard.writeText('');
            }
          } catch {}
        }, clipboardClearSeconds * 1000);
      }
    } catch {
      setIsCopied(true);
      onShowToast?.('کد کپی شد');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleIncrementHotp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingHotp(true);
    const newCounter = (account.counter || 0) + 1;
    try {
      const code = await generateHotp(account.secret, newCounter, {
        algorithm: account.algorithm,
        digits: account.digits,
      });
      setCurrentCode(code);
      onUpdateCounter(account, newCounter);
    } finally {
      setIsGeneratingHotp(false);
    }
  };

  // Avatar backgrounds with crimson/rose tones
  const getAvatarStyle = (name: string) => {
    const styles = [
      'bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white',
      'bg-gradient-to-tr from-[#a63a3a] to-[#5a1414] text-white',
      'bg-gradient-to-tr from-[#5a1414] to-[#2b1313] text-white',
      'bg-gradient-to-tr from-[#902929] to-[#450e0e] text-white',
      'bg-gradient-to-tr from-[#691a1a] to-[#360909] text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return styles[Math.abs(hash) % styles.length];
  };

  const badgeInitial = (account.issuer || account.account || '?')[0].toUpperCase();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDrop={(e) => onDrop?.(e, index)}
      onClick={() => {
        if (!isRevealed) setIsRevealed(true);
        else handleCopyCode();
      }}
      className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#efdcdc] bg-white p-4 sm:p-5 shadow-[0_4px_16px_-6px_rgba(90,20,20,0.08)] transition-all duration-200 hover:border-[#f2c6c6] hover:shadow-[0_8px_24px_-8px_rgba(90,20,20,0.16)] active:scale-[0.99] cursor-pointer select-none"
    >
      {/* Top Row: Avatar + Account Meta + Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 flex-1">
          {/* Avatar Icon */}
          <div
            className={`flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-sm ${getAvatarStyle(
              account.issuer || account.account
            )}`}
          >
            {badgeInitial}
          </div>

          {/* Title and Subtitle */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base sm:text-lg font-bold text-[#2b1313] group-hover:text-[#5a1414] transition-colors">
              {account.issuer || account.account}
            </h3>
            <p className="truncate text-xs text-[#7b6464] mt-0.5">
              {account.account !== account.issuer ? account.account : (account.type === 'hotp' ? 'رمز یکبار مصرف شمارنده‌ای' : 'رمز یکبار مصرف زمان‌دار')}
            </p>
          </div>
        </div>

        {/* Action icons & Dropdown (44x44px touch targets) */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Hide/Reveal toggle button */}
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            aria-label={isRevealed ? t('hideCodesSetting') : t('tapToReveal')}
            title={isRevealed ? t('hideCodesSetting') : t('tapToReveal')}
            className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-[#f2c6c6]/50 hover:text-[#2b1313] active:scale-90 transition"
          >
            {isRevealed ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
          </button>

          {/* Quick copy icon button */}
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={t('copy')}
            title={t('copy')}
            className={`flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl border active:scale-90 transition ${
              isCopied
                ? 'bg-[#f2c6c6] border-[#5a1414] text-[#5a1414]'
                : 'bg-[#fcf2f2] border-[#efdcdc] text-[#7b6464] hover:bg-[#f2c6c6]/50 hover:text-[#2b1313]'
            }`}
          >
            {isCopied ? <Check className="h-5 w-5 sm:h-4 sm:w-4 stroke-[2.5]" /> : <Copy className="h-5 w-5 sm:h-4 sm:w-4" />}
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="گزینه‌ها"
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-[#f2c6c6]/50 hover:text-[#2b1313] active:scale-90 transition"
            >
              <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop on mobile for easy dismissal */}
                <div
                  className="fixed inset-0 z-20 sm:hidden"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute end-0 top-12 z-30 min-w-[190px] overflow-hidden rounded-2xl border border-[#efdcdc] bg-white p-1.5 shadow-xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
                >
                  {index > 0 && (
                    <button
                      onClick={() => {
                        onMoveUp(account);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 sm:py-2 text-xs font-semibold text-[#2b1313] hover:bg-[#fcf2f2] hover:text-[#5a1414] active:bg-[#f2c6c6]/50 transition"
                    >
                      <ArrowUp className="h-4 w-4 text-[#5a1414]" />
                      <span>{t('moveUp')}</span>
                    </button>
                  )}

                  {index < totalCount - 1 && (
                    <button
                      onClick={() => {
                        onMoveDown(account);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 sm:py-2 text-xs font-semibold text-[#2b1313] hover:bg-[#fcf2f2] hover:text-[#5a1414] active:bg-[#f2c6c6]/50 transition"
                    >
                      <ArrowDown className="h-4 w-4 text-[#5a1414]" />
                      <span>{t('moveDown')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onEdit(account);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 sm:py-2 text-xs font-semibold text-[#2b1313] hover:bg-[#fcf2f2] hover:text-[#5a1414] active:bg-[#f2c6c6]/50 transition"
                  >
                    <Edit2 className="h-4 w-4 text-[#7b6464]" />
                    <span>{t('editAccount')}</span>
                  </button>

                  <div className="my-1 border-t border-[#efdcdc]" />

                  <button
                    onClick={() => {
                      onDelete(account);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 sm:py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t('deleteAccount')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Code Display Area */}
      <div
        className={`mt-3.5 flex items-center justify-between rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 border transition-all duration-200 ${
          isCopied
            ? 'border-[#f2c6c6] bg-[#fcf2f2] shadow-sm'
            : 'border-[#efdcdc] bg-[#fcf2f2] hover:border-[#f2c6c6]'
        } active:scale-[0.985]`}
      >
        <div className="flex min-w-0 items-center gap-3 flex-1">
          {isRevealed ? (
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <span
                dir="ltr"
                className={`font-otp text-3xl sm:text-4xl font-extrabold tracking-wider sm:tracking-widest select-all transition-colors ${
                  isCopied
                    ? 'text-[#5a1414]'
                    : remainingSeconds <= 5 && account.type === 'totp'
                    ? 'text-[#d24a3a]'
                    : 'text-[#2b1313]'
                }`}
              >
                {formatOtpCode(currentCode)}
              </span>

              {isCopied ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f2c6c6] border border-[#f2c6c6] px-2.5 py-0.5 text-xs font-bold text-[#5a1414] animate-in fade-in zoom-in-90">
                  <Check className="h-3.5 w-3.5" />
                  کد کپی شد
                </span>
              ) : (
                <span className="text-xs text-[#7b6464]">
                  (لمس برای کپی)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-[#7b6464] text-sm font-medium py-1.5">
              <span className="tracking-widest font-mono text-2xl text-[#7b6464]/50">••••••</span>
              <span className="text-xs text-[#5a1414] font-semibold">({t('tapToReveal')})</span>
            </div>
          )}
        </div>

        {/* Timer Ring or HOTP button */}
        <div className="flex items-center gap-2 shrink-0 ms-2" onClick={(e) => e.stopPropagation()}>
          {account.type === 'totp' ? (
            <CountdownRing
              remainingSeconds={remainingSeconds}
              period={account.period || 30}
              size={42}
              strokeWidth={4}
            />
          ) : (
            <button
              onClick={handleIncrementHotp}
              disabled={isGeneratingHotp}
              className="flex items-center gap-2 rounded-xl border border-[#efdcdc] bg-white px-3.5 py-2 text-xs font-bold text-[#5a1414] hover:bg-[#fcf2f2] active:scale-95 transition shadow-sm"
              title={t('generateNext')}
            >
              <RefreshCw className={`h-4 w-4 ${isGeneratingHotp ? 'animate-spin text-[#5a1414]' : ''}`} />
              <span>#{account.counter || 0}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
