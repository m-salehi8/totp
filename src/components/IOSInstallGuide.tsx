import React, { useState, useEffect } from 'react';
import { Share2, PlusSquare, X, Check, Smartphone } from 'lucide-react';

interface IOSInstallGuideProps {
  onDismissForever?: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ onDismissForever }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  useEffect(() => {
    // Check if running on iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    // Check if running in standalone mode (already added to Home Screen)
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Check if user previously dismissed permanently
    const dismissed = localStorage.getItem('kelidban_ios_guide_dismissed') === 'true';

    // Show guide if on iOS, not standalone, and not dismissed
    if (isIOSDevice && !isStandalone && !dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    if (neverShowAgain) {
      localStorage.setItem('kelidban_ios_guide_dismissed', 'true');
      onDismissForever?.();
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] animate-in fade-in slide-in-from-bottom duration-300"
      dir="rtl"
    >
      <div className="mx-auto max-w-lg rounded-2xl sm:rounded-3xl border border-[#efdcdc] bg-white p-5 shadow-[0_16px_40px_-10px_rgba(90,20,20,0.2)] ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414]">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2b1313]">نصب نسخه آفلاین روی آیفون</h3>
              <p className="text-xs text-[#7b6464]">بدون نیاز به اینترنت در حالت پرواز (Airplane Mode)</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#7b6464] hover:bg-[#fcf2f2] active:scale-95 transition"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Highlighted Instruction */}
        <div className="mt-3.5 rounded-xl bg-[#fcf2f2] border border-[#efdcdc] p-3 text-xs leading-relaxed text-[#2b1313]">
          <span className="font-semibold text-[#5a1414]">راهنما: </span>
          برای استفاده آفلاین در آیفون، دکمه <span className="font-bold inline-flex items-center gap-1 mx-1 text-[#2b1313]"><Share2 className="inline h-3.5 w-3.5 text-[#5a1414]" /> Share</span> را در سافاری بزنید و گزینه <span className="font-bold inline-flex items-center gap-1 mx-1 text-[#2b1313]"><PlusSquare className="inline h-3.5 w-3.5 text-[#5a1414]" /> Add to Home Screen</span> را انتخاب کنید.
        </div>

        {/* Steps */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-[#efdcdc] p-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fcf2f2] text-[#5a1414] text-xs font-bold">
              ۱
            </div>
            <span className="text-[#2b1313]">لمس دکمه Share در منو</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white border border-[#efdcdc] p-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fcf2f2] text-[#5a1414] text-xs font-bold">
              ۲
            </div>
            <span className="text-[#2b1313]">انتخاب Add to Home Screen</span>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-2 border-t border-[#efdcdc]">
          <label className="flex items-center gap-2 text-xs text-[#7b6464] cursor-pointer">
            <input
              type="checkbox"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-[#efdcdc] text-[#5a1414] focus:ring-[#f2c6c6]"
            />
            <span>دیگر نشان نده</span>
          </label>

          <button
            onClick={handleDismiss}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition"
          >
            <Check className="h-3.5 w-3.5" />
            <span>متوجه شدم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
