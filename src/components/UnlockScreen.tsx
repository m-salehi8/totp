import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  Fingerprint,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

interface UnlockScreenProps {
  isFirstRun: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onSetupVault: (password: string) => Promise<void>;
  onBiometricUnlock?: () => Promise<boolean>;
  hasBiometrics: boolean;
  onResetVault?: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  isFirstRun,
  onUnlock,
  onSetupVault,
  onBiometricUnlock,
  hasBiometrics,
  onResetVault,
}) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Password strength score (0-4)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isFirstRun) {
      if (password.length < 8) {
        setError(t('passwordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('passwordsDoNotMatch'));
        return;
      }
      setIsLoading(true);
      try {
        await onSetupVault(password);
      } catch (err: any) {
        setError(err.message || 'خطا در ایجاد گاوصندوق');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!password) return;
      setIsLoading(true);
      try {
        const success = await onUnlock(password);
        if (!success) {
          setError(t('incorrectPassword'));
        }
      } catch {
        setError(t('incorrectPassword'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBiometrics = async () => {
    if (!onBiometricUnlock) return;
    setError('');
    setIsLoading(true);
    try {
      const ok = await onBiometricUnlock();
      if (!ok) {
        setError(t('incorrectPassword'));
      }
    } catch {
      setError(t('incorrectPassword'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-3.5 sm:p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-slate-900/95 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 mb-3.5 shadow-inner">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isFirstRun ? t('setupVaultTitle') : t('appName')}
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm leading-relaxed">
            {isFirstRun ? t('setupVaultDesc') : t('appSubtitle')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('masterPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('masterPasswordPlaceholder')}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3.5 top-3.5 text-slate-400 hover:text-slate-200 active:scale-90 transition"
                aria-label="نمایش گذرواژه"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength bar for first run */}
            {isFirstRun && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 1
                        ? 'w-1/4 bg-rose-500'
                        : strength === 2
                        ? 'w-2/4 bg-amber-500'
                        : strength === 3
                        ? 'w-3/4 bg-sky-500'
                        : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {strength < 2 ? 'گذرواژه ضعیف' : strength === 2 ? 'متوسط' : 'بسیار قوی و ایمن'}
                </p>
              </div>
            )}
          </div>

          {isFirstRun && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {t('confirmPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t('unlocking')}</span>
              </>
            ) : isFirstRun ? (
              <>
                <KeyRound className="h-4 w-4" />
                <span>{t('createVault')}</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>{t('unlockButton')}</span>
              </>
            )}
          </button>

          {/* Biometrics button if available */}
          {!isFirstRun && hasBiometrics && (
            <button
              type="button"
              onClick={handleBiometrics}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-3 text-xs font-semibold text-indigo-400 hover:bg-slate-900 transition"
            >
              <Fingerprint className="h-4 w-4" />
              <span>{t('unlockWithBiometrics')}</span>
            </button>
          )}
        </form>

        {/* Reset Vault option if user forgot password */}
        {!isFirstRun && onResetVault && (
          <div className="mt-4 text-center">
            {showResetConfirm ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 space-y-2">
                <p>در صورت فراموشی گذرواژه، داده‌ها قابل بازیابی نیستند. آیا مایل به ریست کامل گاوصندوق هستید؟</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="rounded-lg px-2.5 py-1 text-slate-300 hover:bg-slate-800"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={onResetVault}
                    className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-500"
                  >
                    حذف و ریست کامل
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition"
              >
                گذرواژه اصلی را فراموش کرده‌اید؟
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
