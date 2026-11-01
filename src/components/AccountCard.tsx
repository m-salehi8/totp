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

  // Copy code with tactile vibration and auto-clear
  const handleCopyCode = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentCode || currentCode === '------') return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentCode);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
      setIsCopied(true);
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

  // Avatar backgrounds
  const getAvatarStyle = (name: string) => {
    const styles = [
      'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
      'bg-sky-500/15 text-sky-400 border-sky-500/25',
      'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
      'bg-amber-500/15 text-amber-400 border-amber-500/25',
      'bg-purple-500/15 text-purple-400 border-purple-500/25',
      'bg-rose-500/15 text-rose-400 border-rose-500/25',
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
      className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-slate-900/95 p-3.5 sm:p-4 shadow-md transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 cursor-pointer select-none"
    >
      {/* Top Row: Avatar + Account Meta + Actions */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 flex-1">
          {/* Avatar Icon */}
          <div
            className={`flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl border text-sm sm:text-base font-bold select-none ${getAvatarStyle(
              account.issuer || account.account
            )}`}
          >
            {badgeInitial}
          </div>

          {/* Title and Subtitle */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm sm:text-base font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
              {account.issuer || account.account}
            </h3>
            <p className="truncate text-[11px] sm:text-xs text-slate-400">
              {account.account !== account.issuer ? account.account : (account.type === 'hotp' ? 'HOTP' : 'TOTP')}
            </p>
          </div>
        </div>

        {/* Action icons & Dropdown */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Hide/Reveal toggle button */}
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            aria-label={isRevealed ? t('hideCodesSetting') : t('tapToReveal')}
            title={isRevealed ? t('hideCodesSetting') : t('tapToReveal')}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-90 transition"
          >
            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Quick copy icon button */}
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={t('copy')}
            title={t('copy')}
            className={`flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl active:scale-90 transition ${
              isCopied
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="گزینه‌ها"
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-90 transition"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop on mobile for easy dismissal */}
                <div
                  className="fixed inset-0 z-20 sm:hidden"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute end-0 top-11 z-30 min-w-[170px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  {index > 0 && (
                    <button
                      onClick={() => {
                        onMoveUp(account);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 active:bg-slate-700/80 transition"
                    >
                      <ArrowUp className="h-4 w-4 text-indigo-400" />
                      <span>{t('moveUp')}</span>
                    </button>
                  )}

                  {index < totalCount - 1 && (
                    <button
                      onClick={() => {
                        onMoveDown(account);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 active:bg-slate-700/80 transition"
                    >
                      <ArrowDown className="h-4 w-4 text-indigo-400" />
                      <span>{t('moveDown')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onEdit(account);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 active:bg-slate-700/80 transition"
                  >
                    <Edit2 className="h-4 w-4 text-slate-400" />
                    <span>{t('editAccount')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-700/60" />

                  <button
                    onClick={() => {
                      onDelete(account);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/20 transition"
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

      {/* Hero Code Row: Tap-to-Copy with responsive digits & ring */}
      <div
        className={`mt-3 flex items-center justify-between rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 border transition-all duration-200 ${
          isCopied
            ? 'border-emerald-500/50 bg-emerald-950/25 shadow-sm shadow-emerald-500/10'
            : 'border-slate-800/90 bg-slate-950/90 hover:border-indigo-500/30'
        } active:scale-[0.985]`}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-1">
          {isRevealed ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                dir="ltr"
                className={`font-otp text-2xl sm:text-3xl font-bold tracking-wider sm:tracking-widest select-all transition-colors ${
                  isCopied
                    ? 'text-emerald-400'
                    : remainingSeconds <= 5 && account.type === 'totp'
                    ? 'text-rose-400'
                    : 'text-indigo-400'
                }`}
              >
                {formatOtpCode(currentCode)}
              </span>

              {isCopied ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 animate-in fade-in zoom-in-90">
                  <Check className="h-3 w-3" />
                  {t('copied')}
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] text-slate-500 hidden xs:inline-block">
                  (لمس برای کپی)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium py-1">
              <span className="tracking-widest font-mono text-xl text-slate-600">••••••</span>
              <span className="text-xs text-indigo-400/80 font-normal">({t('tapToReveal')})</span>
            </div>
          )}
        </div>

        {/* Timer Ring or HOTP trigger */}
        <div className="flex items-center gap-2 shrink-0 ms-2" onClick={(e) => e.stopPropagation()}>
          {account.type === 'totp' ? (
            <CountdownRing
              remainingSeconds={remainingSeconds}
              period={account.period || 30}
              size={38}
              strokeWidth={3.5}
            />
          ) : (
            <button
              onClick={handleIncrementHotp}
              disabled={isGeneratingHotp}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 active:scale-95 transition"
              title={t('generateNext')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingHotp ? 'animate-spin text-indigo-400' : ''}`} />
              <span>#{account.counter || 0}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
