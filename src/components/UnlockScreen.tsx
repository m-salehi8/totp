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
  onOpenLanding?: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  isFirstRun,
  onUnlock,
  onSetupVault,
  onBiometricUnlock,
  hasBiometrics,
  onResetVault,
  onOpenLanding,
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
    <div className="flex min-h-screen flex-col items-center justify-center p-3.5 sm:p-4 bg-gradient-to-b from-[#fffcfc] via-[#fcf2f2] to-[#fffcfc] text-[#2b1313]">
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#efdcdc] bg-white p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(90,20,20,0.12)]">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#5a1414] text-white shadow-lg shadow-[#5a1414]/25 mb-4">
            <Shield className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#5a1414]">
            {isFirstRun ? t('setupVaultTitle') : t('appName')}
          </h1>
          <p className="mt-2 text-xs text-[#7b6464] max-w-sm leading-relaxed">
            {isFirstRun ? t('setupVaultDesc') : t('appSubtitle')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1.5">
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
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-4 py-3.5 text-base sm:text-sm text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3.5 top-3.5 text-[#7b6464] hover:text-[#2b1313] active:scale-90 transition p-1"
                aria-label="نمایش گذرواژه"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength bar for first run */}
            {isFirstRun && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#efdcdc]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 1
                        ? 'w-1/4 bg-rose-600'
                        : strength === 2
                        ? 'w-2/4 bg-amber-500'
                        : strength === 3
                        ? 'w-3/4 bg-sky-500'
                        : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-[#7b6464]">
                  {strength < 2 ? 'گذرواژه ضعیف' : strength === 2 ? 'متوسط' : 'بسیار قوی و ایمن'}
                </p>
              </div>
            )}
          </div>

          {isFirstRun && (
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1.5">
                {t('confirmPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                required
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-4 py-3.5 text-base sm:text-sm text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99] disabled:opacity-50"
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
              className="w-full flex items-center justify-center gap-2 rounded-full border border-[#efdcdc] bg-[#fcf2f2] py-3 text-xs font-semibold text-[#5a1414] hover:bg-white transition"
            >
              <Fingerprint className="h-4 w-4" />
              <span>{t('unlockWithBiometrics')}</span>
            </button>
          )}
        </form>

        {/* Reset Vault option if user forgot password */}
        {!isFirstRun && onResetVault && (
          <div className="mt-5 text-center">
            {showResetConfirm ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-2.5">
                <p>در صورت فراموشی گذرواژه، داده‌ها قابل بازیابی نیستند. آیا مایل به بازنشانی کامل گاوصندوق هستید؟</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="rounded-lg px-3 py-1.5 text-[#7b6464] hover:bg-[#fcf2f2] transition"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={onResetVault}
                    className="rounded-lg bg-rose-600 px-3.5 py-1.5 font-bold text-white hover:bg-rose-700 transition shadow-sm"
                  >
                    حذف و بازنشانی کامل
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-[#7b6464] hover:text-[#5a1414] transition"
              >
                گذرواژه اصلی را فراموش کرده‌اید؟
              </button>
            )}
          </div>
        )}

        {/* Return to Landing Page */}
        {onOpenLanding && (
          <div className="mt-4 text-center pt-3 border-t border-[#efdcdc]">
            <button
              type="button"
              onClick={onOpenLanding}
              className="text-xs font-semibold text-[#7b6464] hover:text-[#5a1414] transition inline-flex items-center gap-1.5"
            >
              <span>بازگشت به صفحه معرفی و راهنما</span>
              <span className="text-sm">←</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
