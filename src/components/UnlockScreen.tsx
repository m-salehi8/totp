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
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

interface UnlockScreenProps {
  isFirstRun: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onSetupVault: (password: string) => Promise<void>;
  onSkipPin?: () => void;
  onBiometricUnlock?: () => Promise<boolean>;
  hasBiometrics: boolean;
  onResetVault?: () => void;
  onOpenLanding?: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  isFirstRun,
  onUnlock,
  onSetupVault,
  onSkipPin,
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

  // Quick PIN keypad press
  const handleKeypadPress = (digit: string) => {
    if (password.length < 8) {
      setPassword((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPassword((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isFirstRun) {
      if (password.length < 4) {
        setError('پین‌کد یا گذرواژه باید حداقل ۴ کاراکتر باشد');
        return;
      }
      if (password !== confirmPassword) {
        setError('تکرار پین‌کد با رمز اصلی مطابقت ندارد');
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
          setError('پین‌کد یا گذرواژه واردشده اشتباه است');
        }
      } catch {
        setError('پین‌کد یا گذرواژه واردشده اشتباه است');
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
        setError('احراز هویت بیومتریک تایید نشد');
      }
    } catch {
      setError('احراز هویت بیومتریک تایید نشد');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-3.5 sm:p-4 bg-gradient-to-b from-[#fffcfc] via-[#fcf2f2] to-[#fffcfc] text-[#2b1313]">
      <div className="w-full max-w-sm rounded-3xl border border-[#efdcdc] bg-white p-6 sm:p-8 shadow-[0_16px_40px_-12px_rgba(90,20,20,0.14)]">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white shadow-lg shadow-[#5a1414]/25 mb-4">
            <Shield className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2b1313]">
            {isFirstRun ? 'تنظیم پین‌کد گاوصندوق' : 'بازگشایی کلیدبان'}
          </h1>
          <p className="mt-1.5 text-xs text-[#7b6464] max-w-xs leading-relaxed">
            {isFirstRun
              ? 'یک پین‌کد یا گذرواژه امن برای رمزنگاری بومی حساب‌ها با AES-GCM تعیین کنید.'
              : 'برای دسترسی به کدهای یک‌بارمصرف، پین‌کد خود را وارد نمایید.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2b1313] mb-1.5">
              {isFirstRun ? 'پین‌کد / گذرواژه جدید' : 'پین‌کد یا گذرواژه'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isFirstRun ? 'حداقل ۴ رقم یا کاراکتر' : 'پین‌کد خود را وارد کنید'}
                required
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-4 py-3.5 text-center text-lg font-mono tracking-widest text-[#2b1313] placeholder-[#7b6464]/50 focus:bg-white focus:border-[#5a1414] focus:ring-1 focus:ring-[#f2c6c6] focus:outline-none transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-3.5 text-[#7b6464] hover:text-[#2b1313] active:scale-90 transition p-1"
                aria-label="نمایش گذرواژه"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isFirstRun && (
            <div>
              <label className="block text-xs font-semibold text-[#2b1313] mb-1.5">
                تکرار پین‌کد
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="پین‌کد را مجدداً وارد نمایید"
                required
                className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-4 py-3.5 text-center text-lg font-mono tracking-widest text-[#2b1313] placeholder-[#7b6464]/50 focus:bg-white focus:border-[#5a1414] focus:ring-1 focus:ring-[#f2c6c6] focus:outline-none transition shadow-sm"
              />
            </div>
          )}

          {/* Quick iOS-style Keypad for mobile convenience */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="flex h-12 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-lg font-bold text-[#2b1313] hover:bg-[#f2c6c6]/50 active:scale-95 transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPassword('')}
              className="flex h-12 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-xs font-semibold text-[#7b6464] hover:bg-[#fcf2f2] active:scale-95 transition"
            >
              پاک کردن
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="flex h-12 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-lg font-bold text-[#2b1313] hover:bg-[#f2c6c6]/50 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="flex h-12 items-center justify-center rounded-xl bg-white border border-[#efdcdc] text-xs font-semibold text-[#7b6464] hover:bg-[#fcf2f2] active:scale-95 transition"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3.5 text-sm font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>در حال بررسی...</span>
              </>
            ) : isFirstRun ? (
              <>
                <KeyRound className="h-4 w-4" />
                <span>فعال‌سازی قفل و ورود</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>بازگشایی برنامه</span>
              </>
            )}
          </button>

          {/* Biometrics button if available */}
          {!isFirstRun && hasBiometrics && (
            <button
              type="button"
              onClick={handleBiometrics}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-[#f2c6c6] bg-[#fcf2f2] py-3 text-xs font-semibold text-[#5a1414] hover:bg-[#f2c6c6]/50 transition"
            >
              <Fingerprint className="h-4 w-4" />
              <span>بازگشایی با Face ID / اثر انگشت</span>
            </button>
          )}

          {/* Option to skip PIN on first run for quick access */}
          {isFirstRun && onSkipPin && (
            <button
              type="button"
              onClick={onSkipPin}
              className="w-full text-center py-2 text-xs font-semibold text-[#7b6464] hover:text-[#5a1414] transition"
            >
              ورود مستقیم بدون پین‌کد (قابل تنظیم بعداً)
            </button>
          )}
        </form>

        {/* Reset Vault option if user forgot password */}
        {!isFirstRun && onResetVault && (
          <div className="mt-4 text-center">
            {showResetConfirm ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-2">
                <p>با بازنشانی کامل، کلیه حساب‌ها پاک خواهند شد. ادامه می‌دهید؟</p>
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
                پین‌کد خود را فراموش کرده‌اید؟
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
              <span>مشاهده راهنما و امکانات</span>
              <span className="text-sm">←</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
