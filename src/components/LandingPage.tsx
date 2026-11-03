import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Smartphone,
  Download,
  KeyRound,
  Lock,
  Clock,
  Eye,
  CheckCircle2,
  ChevronDown,
  Layers,
  QrCode,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [activeInstallTab, setActiveInstallTab] = useState<'ios' | 'and'>('and');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Live Simulated Codes in Phone Mockup
  const [phoneCodes, setPhoneCodes] = useState([
    { name: 'سازمان مرکزی / پرتال اداری', code: '564 795', seed: 11 },
    { name: 'سامانه احراز هویت یکپارچه', code: '812 340', seed: 27 },
    { name: 'پایگاه اسناد محرمانه', code: '409 621', seed: 43 },
  ]);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  // Typing Demo State for Step 3
  const [typingIndex, setTypingIndex] = useState(0);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const demoCode = '482913';

  // Live Timer for Phone Mockup
  useEffect(() => {
    const updateCodes = () => {
      const now = Date.now();
      const sec = 30 - Math.floor((now % 30000) / 1000);
      setSecondsRemaining(sec);

      const windowStep = Math.floor(now / 30000);
      const hash = (seed: number, win: number) => {
        let h = (Math.imul(win, 2654435761) ^ Math.imul(seed, 40503)) >>> 0;
        h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
        h = (h ^ (h >>> 16)) >>> 0;
        const val = h % 1000000;
        const s = String(val).padStart(6, '0');
        return `${s.slice(0, 3)} ${s.slice(3)}`;
      };

      setPhoneCodes([
        { name: 'سازمان مرکزی / پرتال اداری', code: hash(11, windowStep), seed: 11 },
        { name: 'سامانه احراز هویت یکپارچه', code: hash(27, windowStep), seed: 27 },
        { name: 'پایگاه اسناد محرمانه', code: hash(43, windowStep), seed: 43 },
      ]);
    };

    updateCodes();
    const interval = setInterval(updateCodes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Step 3 Interactive Typing Demo loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (typingIndex < 6) {
      timer = setTimeout(() => {
        setTypingIndex((prev) => prev + 1);
      }, 500);
    } else if (typingIndex === 6 && !showSuccessBadge) {
      timer = setTimeout(() => {
        setShowSuccessBadge(true);
      }, 300);
    } else {
      timer = setTimeout(() => {
        setShowSuccessBadge(false);
        setTypingIndex(0);
      }, 2600);
    }
    return () => clearTimeout(timer);
  }, [typingIndex, showSuccessBadge]);

  // Scroll Listener for Sticky Bar & Header Glass Effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowSticky(window.scrollY > 480);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toPersianNum = (n: number) => {
    return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  };

  const ringDashOffset = 113.1 * (1 - (secondsRemaining - 1) / 30);

  return (
    <div className="min-h-screen bg-[#fffcfc] text-[#2b1313] selection:bg-[#f2c6c6] selection:text-[#5a1414] overflow-x-hidden font-sans">
      {/* HEADER NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#fffcfc]/90 backdrop-blur-xl border-b border-[#efdcdc] shadow-[0_1px_0_#efdcdc]'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-bold text-[#5a1414] transition hover:opacity-90"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white shadow-md shadow-[#5a1414]/30">
              <Shield className="h-5 w-5" />
            </span>
            <span className="tracking-tight text-xl font-extrabold text-[#5a1414]">کلیدبان</span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#7b6464]">
            <a href="#how" className="hover:text-[#5a1414] transition">
              چطور کار می‌کند؟
            </a>
            <a href="#features" className="hover:text-[#5a1414] transition">
              امکانات
            </a>
            <a href="#install" className="hover:text-[#5a1414] transition">
              راهنمای نصب
            </a>
            <a href="#faq" className="hover:text-[#5a1414] transition">
              پرسش‌های متداول
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="/totp-authenticator.apk"
              download="totp-authenticator.apk"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#f2c6c6] bg-white px-3.5 py-2 text-xs font-bold text-[#5a1414] hover:bg-[#fcf2f2] shadow-sm transition active:scale-95"
            >
              <Smartphone className="h-4 w-4" />
              <span>دانلود APK</span>
            </a>

            <button
              onClick={onOpenApp}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-110 active:scale-95 transition"
            >
              <span>ورود به برنامه</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        id="top"
        className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-[radial-gradient(900px_500px_at_85%_-10%,#fcf2f2,transparent_70%),radial-gradient(700px_480px_at_0%_30%,#f9e3e3_0,transparent_65%),#fffcfc]"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left/Main Column: Copy & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start text-start">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#f2c6c6] bg-white px-3.5 py-1.5 text-xs font-bold text-[#5a1414] shadow-sm mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span>ورود دو مرحله‌ای سازمانی؛ ساده، مستقل و امن</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-[#390a0a] leading-[1.3] tracking-tight">
                کلیدبان؛ <span className="bg-gradient-to-r from-[#7d2323] via-[#a63a3a] to-[#7d2323] bg-clip-text text-transparent">نگهبان</span> ورود شما
              </h1>

              {/* Subtitle */}
              <p className="mt-4 sm:mt-5 text-sm sm:text-lg text-[#7b6464] leading-relaxed max-w-2xl">
                کد ۶ رقمی ورود را مستقیماً روی گوشی خودتان بسازید. هر ۳۰ ثانیه یک کد تازه، فارسی و بدون وابستگی به پیامک یا اتصال اینترنت؛ حتی اگر رمز شما افشا شود، بدون گوشی اختصاصی‌تان هیچ‌کس امکان ورود نخواهد داشت.
              </p>

              {/* CTA Buttons Row */}
              <div className="mt-7 sm:mt-8 flex flex-wrap gap-3 w-full sm:w-auto">
                {/* Primary Button: Open Web App */}
                <button
                  onClick={onOpenApp}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-[#5a1414]/30 hover:brightness-110 active:scale-95 transition"
                >
                  <Sparkles className="h-5 w-5 text-amber-200" />
                  <span>ورود به نسخه تحت وب</span>
                </button>

                {/* Secondary Button: Download APK */}
                <a
                  href="/totp-authenticator.apk"
                  download="totp-authenticator.apk"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-full border border-[#f2c6c6] bg-white px-5 sm:px-7 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-[#5a1414] hover:bg-[#fcf2f2] shadow-sm transition active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود مستقیم APK</span>
                </a>

                {/* Tertiary Button: Scroll to How It Works */}
                <a
                  href="#how"
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-3.5 text-xs font-semibold text-[#7b6464] hover:text-[#5a1414] transition"
                >
                  <span>چطور کار می‌کند؟</span>
                  <ChevronDown className="h-4 w-4" />
                </a>
              </div>

              {/* Key Highlights Chips */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#efdcdc] bg-[#fcf2f2] px-3 py-1 text-xs font-semibold text-[#5a1414]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  کاملاً فارسی و راست‌چین
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#efdcdc] bg-[#fcf2f2] px-3 py-1 text-xs font-semibold text-[#5a1414]">
                  <Clock className="h-3.5 w-3.5 text-[#5a1414]" />
                  تولید کد جدید هر ۳۰ ثانیه
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#efdcdc] bg-[#fcf2f2] px-3 py-1 text-xs font-semibold text-[#5a1414]">
                  <Eye className="h-3.5 w-3.5 text-[#5a1414]" />
                  آفلاین و بدون ارسال پیامک
                </span>
              </div>
            </div>

            {/* Right Column: Live Interactive Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                onClick={onOpenApp}
                title="کلیک برای باز کردن برنامه"
                className="group relative cursor-pointer select-none transition-transform duration-300 hover:scale-[1.02]"
              >
                {/* Background Glow Circles */}
                <div className="absolute -inset-4 rounded-full bg-[#f2c6c6]/40 blur-2xl pointer-events-none" />

                {/* Phone Frame */}
                <div className="relative w-[270px] sm:w-[290px] rounded-[44px] p-2.5 bg-gradient-to-b from-[#4a1212] via-[#2a0707] to-[#1a0404] shadow-[0_30px_70px_-20px_rgba(90,20,20,0.6)] border border-white/10">
                  {/* Speaker Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-20 bg-[#120303] rounded-full z-20" />

                  {/* Phone Screen */}
                  <div className="relative h-[530px] rounded-[36px] bg-gradient-to-b from-white to-[#fcf2f2] p-4 pt-11 flex flex-col justify-between overflow-hidden border border-[#efdcdc]">
                    {/* Screen Header */}
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#efdcdc]">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5a1414] text-white">
                            <Shield className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-extrabold text-xs text-[#5a1414]">کلیدبان</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#7b6464] bg-[#fcf2f2] border border-[#efdcdc] px-2 py-0.5 rounded-full">
                          ۳ حساب فعال
                        </span>
                      </div>

                      {/* Phone Account Cards */}
                      <div className="mt-3 space-y-2.5">
                        {phoneCodes.map((acc, idx) => (
                          <div
                            key={acc.name}
                            className={`rounded-2xl border p-2.5 transition bg-white shadow-sm ${
                              idx === 0
                                ? 'border-[#5a1414]/30 shadow-md ring-1 ring-[#5a1414]/15'
                                : 'border-[#efdcdc] opacity-90'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-[#7d2323] to-[#5a1414] text-white font-bold text-xs">
                                  {acc.name.charAt(0)}
                                </span>
                                <div className="truncate">
                                  <p className="text-[11px] font-bold text-[#2b1313] truncate">{acc.name}</p>
                                </div>
                              </div>
                            </div>

                            {/* OTP Box */}
                            <div className="mt-2 flex items-center justify-between rounded-xl bg-[#fcf2f2] px-3 py-1.5 border border-[#efdcdc]">
                              <span className="font-mono text-base font-extrabold tracking-wider text-[#2b1313]">
                                {acc.code}
                              </span>

                              {/* Countdown Ring */}
                              <div className="relative flex h-7 w-7 items-center justify-center">
                                <svg className="h-7 w-7 -rotate-90">
                                  <circle
                                    cx="14"
                                    cy="14"
                                    r="11"
                                    fill="none"
                                    stroke="#efdcdc"
                                    strokeWidth="2.5"
                                  />
                                  <circle
                                    cx="14"
                                    cy="14"
                                    r="11"
                                    fill="none"
                                    stroke={secondsRemaining <= 5 ? '#d24a3a' : '#5a1414'}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeDasharray="69.1"
                                    strokeDashoffset={69.1 * (1 - (secondsRemaining - 1) / 30)}
                                  />
                                </svg>
                                <span
                                  className={`absolute text-[9px] font-mono font-bold ${
                                    secondsRemaining <= 5 ? 'text-[#d24a3a] animate-pulse' : 'text-[#7b6464]'
                                  }`}
                                >
                                  {toPersianNum(secondsRemaining)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA Overlay inside Phone */}
                    <div className="rounded-2xl bg-gradient-to-r from-[#7d2323] to-[#5a1414] p-3 text-center text-white shadow-lg">
                      <p className="text-xs font-bold">برای اجرای وب‌اپلیکیشن لمس کنید</p>
                      <p className="text-[10px] text-[#f2c6c6] mt-0.5">بدون نیاز به نصب، روی مرورگر شما</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 SIMPLE STEPS) */}
      <section id="how" className="py-20 sm:py-28 bg-gradient-to-b from-[#2a0707] via-[#390a0a] to-[#2a0707] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
            <span className="text-xs sm:text-sm font-bold text-rose-300 tracking-wider">
              سه قدم تا امنیت کامل
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              راه‌اندازی در کمتر از یک دقیقه
            </h2>
            <p className="text-xs sm:text-sm text-rose-200/80 mt-3 leading-relaxed">
              یک بار برنامه را باز می‌کنید و کد QR ارائه‌شده توسط سازمان را اسکن می‌کنید. از آن به بعد هر زمان بخواهید، رمز تازه ۶ رقمی آماده است.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex flex-col justify-between hover:bg-white/10 transition">
              <span className="font-mono text-4xl font-extrabold text-white/15">۰۱</span>
              <div className="my-6 flex h-32 items-center justify-center rounded-2xl bg-black/25 border border-white/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7d2323] to-[#a63a3a] text-white shadow-lg">
                  <Download className="h-8 w-8 animate-bounce" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">کلیدبان را باز کنید</h3>
                <p className="text-xs text-rose-200/75 leading-relaxed">
                  نسخه تحت وب را با یک کلیک اجرا کنید، یا فایل نصبی مستقیم APK را برای گوشی اندرویدی خود دریافت نمایید.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex flex-col justify-between hover:bg-white/10 transition">
              <span className="font-mono text-4xl font-extrabold text-white/15">۰۲</span>
              <div className="my-6 flex h-32 items-center justify-center rounded-2xl bg-black/25 border border-white/10 relative overflow-hidden">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#2b1313] p-2 shadow-lg">
                  <QrCode className="h-full w-full" />
                </div>
                {/* Laser scan line animation */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_12px_#ff6b6b] animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">حساب را اسکن کنید</h3>
                <p className="text-xs text-rose-200/75 leading-relaxed">
                  کد QR ورود دومرحله‌ای را با دوربین گوشی اسکن کرده یا کلید مخفی را وارد کنید تا حساب بلافاصله ثبت گردد.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex flex-col justify-between hover:bg-white/10 transition">
              <span className="font-mono text-4xl font-extrabold text-white/15">۰۳</span>
              <div className="my-6 flex h-32 flex-col items-center justify-center rounded-2xl bg-black/25 border border-white/10 gap-2">
                <div className="flex gap-1.5">
                  {demoCode.split('').map((char, i) => (
                    <span
                      key={i}
                      className={`flex h-9 w-7 items-center justify-center rounded-lg font-mono font-bold text-sm border transition-all ${
                        i < typingIndex
                          ? 'bg-white/20 border-rose-300 text-white -translate-y-1'
                          : 'bg-white/5 border-white/15 text-transparent'
                      }`}
                    >
                      {char}
                    </span>
                  ))}
                </div>
                {showSuccessBadge && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full animate-in fade-in">
                    <CheckCircle2 className="h-3 w-3" /> ورود موفق
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">کد ۶ رقمی را وارد کنید</h3>
                <p className="text-xs text-rose-200/75 leading-relaxed">
                  هنگام ورود به سامانه، عدد جاری را از کلیدبان لمس کنید تا کپی شود و در کادر رمز یکبار مصرف درج کنید.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY TWO-FACTOR (EQUATION) */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-[#fcf2f2] via-[#fffcfc] to-[#fcf2f2] border-y border-[#efdcdc]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <span className="text-xs sm:text-sm font-bold text-[#5a1414] tracking-wider">
            چرا گذرواژه تنها کافی نیست؟
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#390a0a] mt-2">
            معادله طلایی امنیت حساب شما
          </h2>
          <p className="text-xs sm:text-sm text-[#7b6464] mt-3 max-w-xl mx-auto leading-relaxed">
            گذرواژه‌ها ممکن است لو بروند یا با فیشینگ به سرقت بروند، اما کد کلیدبان صرفاً در حافظه فیزیکی گوشی شما وجود دارد و پس از ۳۰ ثانیه می‌سوزد.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* Box 1 */}
            <div className="rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-3">
                <Lock className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-sm text-[#2b1313]">گذرواژه اصلی</h4>
              <p className="text-xs text-[#7b6464] mt-1">چیزی که می‌دانید</p>
            </div>

            <span className="text-3xl font-extrabold text-[#a63a3a]">+</span>

            {/* Box 2 */}
            <div className="rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-3">
                <Smartphone className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-sm text-[#2b1313]">کد کلیدبان</h4>
              <p className="text-xs text-[#7b6464] mt-1">چیزی که همراه دارید</p>
            </div>

            <span className="text-3xl font-extrabold text-[#a63a3a]">=</span>

            {/* Result Box */}
            <div className="rounded-3xl bg-gradient-to-tr from-[#7d2323] to-[#390a0a] text-white p-6 shadow-xl shadow-[#5a1414]/25">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white mb-3">
                <Shield className="h-7 w-7 text-emerald-300" />
              </div>
              <h4 className="font-bold text-sm text-white">ورود ۱۰۰٪ امن</h4>
              <p className="text-xs text-rose-200 mt-1">غیرقابل نفوذ از راه دور</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-20 sm:py-28 bg-[#fffcfc]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs sm:text-sm font-bold text-[#5a1414] tracking-wider">
              ویژگی‌های کلیدی
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#390a0a] mt-2">
              سبک، سریع و قابل‌اعتماد
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">کد تازه هر ۳۰ ثانیه</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                ارقام با استاندارد جهانی RFC 6238 دائماً به‌روزرسانی شده و تایمر حلقه‌ای با تغییر رنگ، زمان باقی‌مانده را نمایش می‌دهد.
              </p>
            </div>

            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">بدون نیاز به پیامک</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                بدون معطلی در انتظار ارسال پیامک مخابراتی یا خطر رهگیری، کلیه کدها به صورت محلی روی چیپ گوشی تولید می‌شوند.
              </p>
            </div>

            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">رمزنگاری نظامی AES-256</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                تمام کلیدها با الگوریتم AES-256-GCM و مشتق‌سازی کلید PBKDF2 با گذرواژه اختصاصی شما درون دستگاه قفل می‌شوند.
              </p>
            </div>

            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">مدیریت نامحدود حساب‌ها</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                کدهای تمامی پورتال‌های سازمانی، ایمیل‌ها و حساب‌های کاری خود را در یک فهرست منظم با جستجوی سریع نگهداری کنید.
              </p>
            </div>

            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">اسکن آسان QR و تصویر</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                امکان اسکن فوری با دوربین گوشی، آپلود عکس بارکد از گالری، یا الصاق آدرس پیوند استاندارد otpauth:// وجود دارد.
              </p>
            </div>

            <div className="group rounded-3xl border border-[#efdcdc] bg-white p-6 shadow-sm hover:border-[#f2c6c6] hover:shadow-lg transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf2f2] text-[#5a1414] mb-4 group-hover:bg-[#5a1414] group-hover:text-white transition">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1313] mb-1.5">نصب مستقیم و فایل APK</h3>
              <p className="text-xs text-[#7b6464] leading-relaxed">
                هم به عنوان وب‌اپلیکیشن بدون نصب و هم با فایل APK مستقیم برای دستگاه‌های اندرویدی بدون واسطه در دسترس است.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTALL GUIDE (TABS) */}
      <section id="install" className="py-20 sm:py-24 bg-[#fcf2f2] border-t border-[#efdcdc]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs sm:text-sm font-bold text-[#5a1414] tracking-wider">
              راهنمای راه‌اندازی
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#390a0a] mt-2">
              نصب روی گوشی شما
            </h2>
            <p className="text-xs sm:text-sm text-[#7b6464] mt-2">
              نوع سیستم‌عامل دستگاه خود را انتخاب نمایید:
            </p>
          </div>

          {/* Platform Tabs Switcher */}
          <div className="mx-auto flex max-w-xs p-1 rounded-full bg-white border border-[#efdcdc] shadow-sm mb-8">
            <button
              onClick={() => setActiveInstallTab('and')}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold transition ${
                activeInstallTab === 'and'
                  ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                  : 'text-[#7b6464] hover:text-[#5a1414]'
              }`}
            >
              اندروید (Android)
            </button>
            <button
              onClick={() => setActiveInstallTab('ios')}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold transition ${
                activeInstallTab === 'ios'
                  ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                  : 'text-[#7b6464] hover:text-[#5a1414]'
              }`}
            >
              آیفون (iOS)
            </button>
          </div>

          {/* Android Steps */}
          {activeInstallTab === 'and' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۱
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">دانلود فایل نصبی (APK) یا نسخه وب</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    دکمه دانلود مستقیم APK را در کادر زیر لمس کنید تا فایل دانلود شود، یا روی دکمه ورود به نسخه وب بزنید.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۲
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">نصب برنامه</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    فایل دانلودشده را باز کرده و در صورت درخواست اجازه نصب از منابع ناشناس، آن را تایید نمایید.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۳
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">تعیین گذرواژه ورود</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    یک گذرواژه امن برای گاوصندوق خود تعیین کرده و با اسکن کد QR حساب‌های خود را فعال کنید.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/totp-authenticator.apk"
                  download="totp-authenticator.apk"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود فایل نصبی اندروید (APK)</span>
                </a>
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#efdcdc] px-6 py-3.5 text-xs font-bold text-[#5a1414] hover:bg-[#fffcfc] shadow-sm transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>اجرای آنلاین نسخه تحت وب</span>
                </button>
              </div>
            </div>
          )}

          {/* iOS Steps */}
          {activeInstallTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۱
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">باز کردن در مرورگر Safari</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    روی دکمه «ورود به نسخه تحت وب» کلیک کنید تا برنامه در مرورگر سافاری گوشی شما اجرا شود.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۲
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">افزودن به صفحه اصلی (Add to Home Screen)</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    دکمه Share (مربع با فلش رو به بالا) را لمس کرده و گزینه «Add to Home Screen» را بزنید.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white border border-[#efdcdc] p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5a1414] text-white font-bold text-xs">
                  ۳
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[#2b1313]">اجرای مستقل مانند اپ بومی</h4>
                  <p className="text-xs text-[#7b6464] mt-0.5">
                    آیکون کلیدبان روی صفحه اصلی گوشی شما قرار می‌گیرد و بدون نیاز به اینترنت کار می‌کند.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] px-8 py-3.5 text-xs font-bold text-white shadow-md shadow-[#5a1414]/25 hover:brightness-105 transition"
                >
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  <span>ورود به برنامه در مرورگر</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 sm:py-24 bg-[#fffcfc]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs sm:text-sm font-bold text-[#5a1414] tracking-wider">
              پرسش‌های متداول
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#390a0a] mt-2">
              پاسخ به سوالات رایج
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'ورود دو مرحله‌ای (TOTP) چیست و چرا ضروری است؟',
                a: 'یعنی علاوه بر گذرواژه، به یک کد ۶ رقمی کوتاه‌مدت متغیر نیاز است. چون این کد صرفاً بر روی دستگاه فیزیکی شما تولید می‌شود، حتی در صورت سرقت گذرواژه اصلی، نفوذ به حساب شما غیرممکن خواهد بود.',
              },
              {
                q: 'هر کد چند ثانیه اعتبار دارد؟',
                a: 'طبق استاندارد امنیتی، هر کد دقیقاً ۳۰ ثانیه معتبر است. در صورتی که زمان کد در حال اتمام باشد (تایمر قرمز شود)، پیشنهاد می‌شود چند ثانیه صبر کرده و کد دوره جدید را استفاده فرمایید.',
              },
              {
                q: 'آیا برای تولید کدهای ورود به اینترنت نیاز است؟',
                a: 'خیر. تولید کدهای TOTP کاملاً ریاضی و بر اساس زمان و کلید رمزنگاری محلی انجام می‌شود و به هیچ نوع ارتباط اینترنتی یا پیامک نیاز ندارد.',
              },
              {
                q: 'اگر گوشی عوض شود داده‌ها چگونه بازیابی می‌شوند؟',
                a: 'شما می‌توانید در بخش تنظیمات برنامه، نسخه پشتیبان رمزنگاری‌شده تهیه نموده و روی گوشی جدید خود بازیابی فرمایید.',
              },
              {
                q: 'کدها خطا می‌دهند، علت چیست؟',
                a: 'چون کدهای TOTP به ثانیه‌های دقیق ساعت وابسته‌اند، مطمئن شوید گزینه «ساعت خودکار شبکه (Automatic Date & Time)» در تنظیمات گوشی شما روشن است.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#efdcdc] bg-white overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-start font-bold text-sm sm:text-base text-[#2b1313] hover:text-[#5a1414] transition"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-[#5a1414] shrink-0 transition-transform duration-300 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#7b6464] leading-relaxed border-t border-[#fcf2f2] pt-3 animate-in fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA BAND */}
      <section className="pb-24 sm:pb-32 bg-[#fffcfc]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-[32px] sm:rounded-[40px] bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] p-8 sm:p-14 text-center text-white shadow-2xl shadow-[#5a1414]/30 relative overflow-hidden">
            <div className="relative z-10 max-w-xl mx-auto">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 mx-auto text-white mb-4">
                <Shield className="h-7 w-7 text-rose-200" />
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                امروز ورود خود را امن‌تر کنید
              </h2>
              <p className="text-xs sm:text-sm text-rose-200/90 mt-3 mb-8 leading-relaxed">
                کلیدبان را باز کنید و در کمتر از یک دقیقه، نفوذناپذیری حساب‌ها و پورتال‌های سازمانی خود را دوچندان نمایید.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#5a1414] shadow-lg hover:bg-rose-50 active:scale-95 transition"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>ورود به نسخه تحت وب</span>
                </button>
                <a
                  href="/totp-authenticator.apk"
                  download="totp-authenticator.apk"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-bold text-white hover:bg-white/20 active:scale-95 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>دانلود فایل APK</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#efdcdc] py-8 bg-[#fffcfc] text-[#7b6464] text-xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-[#5a1414]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5a1414] text-white">
              <Shield className="h-4 w-4" />
            </span>
            <span>کلیدبان</span>
            <span className="text-[#7b6464] font-normal">| نگهبان ورود شما</span>
          </div>
          <p className="text-center sm:text-end text-[11px] text-[#7b6464]">
            سامانه رمزساز دوعاملی امن، آفلاین و متن‌باز
          </p>
        </div>
      </footer>

      {/* STICKY MOBILE CTA BAR */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-[#fffcfc]/95 backdrop-blur-xl border-t border-[#efdcdc] p-3 px-4 transition-transform duration-300 md:hidden ${
          showSticky ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenApp}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d2323] to-[#5a1414] py-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
          >
            <span>ورود به برنامه</span>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <a
            href="/totp-authenticator.apk"
            download="totp-authenticator.apk"
            className="flex items-center justify-center gap-1.5 rounded-full border border-[#f2c6c6] bg-white px-4 py-3 text-xs font-bold text-[#5a1414] active:scale-95 transition shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>دانلود APK</span>
          </a>
        </div>
      </div>
    </div>
  );
};
