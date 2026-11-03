import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Link,
  Image as ImageIcon,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';
import jsQR from 'jsqr';
import { parseOtpAuthUri } from '../domain/otpauth';
import type { HashAlgorithm, OtpAccount, OtpType } from '../domain/types';
import { useI18n } from '../i18n/i18nContext';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (acc: Omit<OtpAccount, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
  existingAccounts: OtpAccount[];
}

type TabType = 'scan' | 'paste' | 'image' | 'manual';

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
  existingAccounts,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');

  // Manual Form States
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [secret, setSecret] = useState('');
  const [type, setType] = useState<OtpType>('totp');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [counter, setCounter] = useState<number>(0);

  // Paste URI state
  const [uriInput, setUriInput] = useState('');

  // Camera Scanner States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Stop camera when closing or changing tabs
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      stopCamera();
      if (activeTab !== 'scan') {
        setError('');
      }
    } else if (isOpen && activeTab === 'scan') {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setError('');
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanVideoLoop();
      }
    } catch (err: any) {
      setIsScanning(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(t('cameraPermissionDenied'));
      } else {
        setError(t('noCameraFound'));
      }
    }
  };

  const scanVideoLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanVideoLoop);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);

      // 1. Try native BarcodeDetector if available
      let foundCode = '';
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(canvas);
          if (barcodes.length > 0) {
            foundCode = barcodes[0].rawValue;
          }
        } catch {
          // Fall back to jsQR
        }
      }

      // 2. Fallback to jsQR
      if (!foundCode) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          foundCode = code.data;
        }
      }

      if (foundCode) {
        stopCamera();
        handleFoundUri(foundCode);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoLoop);
  };

  const handleFoundUri = (uri: string) => {
    try {
      const parsed = parseOtpAuthUri(uri);
      checkDuplicateAndAdd(parsed);
    } catch (err: any) {
      setError(t('invalidQrCode') + ` (${err.message})`);
      setIsScanning(true);
    }
  };

  const checkDuplicateAndAdd = (data: {
    issuer: string;
    account: string;
    secret: string;
    type: OtpType;
    algorithm: HashAlgorithm;
    digits: number;
    period: number;
    counter?: number;
  }) => {
    const isDuplicate = existingAccounts.some(
      (a) =>
        a.issuer.toLowerCase() === data.issuer.toLowerCase() &&
        a.account.toLowerCase() === data.account.toLowerCase()
    );

    if (isDuplicate) {
      setWarning(t('duplicateAccountWarning'));
    }

    onAddAccount(data);
    onClose();
    resetForm();
  };

  const handleImageUpload = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        let found = '';
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            if (barcodes.length > 0) found = barcodes[0].rawValue;
          } catch {}
        }

        if (!found) {
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height);
          if (qr && qr.data) found = qr.data;
        }

        if (found) {
          handleFoundUri(found);
        } else {
          setError(t('invalidQrCode'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!uriInput.trim()) return;
    try {
      const parsed = parseOtpAuthUri(uriInput.trim());
      checkDuplicateAndAdd(parsed);
    } catch (err: any) {
      setError(err.message || t('invalidQrCode'));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!secret.trim()) {
      setError(t('secretKey') + ' ' + t('noAccounts'));
      return;
    }

    try {
      checkDuplicateAndAdd({
        issuer: issuer.trim() || 'Custom',
        account: account.trim() || 'Account',
        secret: secret.trim(),
        type,
        algorithm,
        digits,
        period,
        counter,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setIssuer('');
    setAccount('');
    setSecret('');
    setUriInput('');
    setError('');
    setWarning('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2b1313]/60 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-3xl border-t sm:border border-[#efdcdc] bg-white p-4 sm:p-6 shadow-[0_20px_40px_-15px_rgba(90,20,20,0.2)] overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col text-[#2b1313] transition-colors">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-12 rounded-full bg-[#efdcdc] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#efdcdc]">
          <h2 className="text-base sm:text-lg font-bold text-[#5a1414] flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#5a1414]" />
            {t('addAccount')}
          </h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="بستن"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[#7b6464] hover:bg-white hover:text-[#2b1313] active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 my-3.5 rounded-xl bg-[#fcf2f2] border border-[#efdcdc] text-[11px] sm:text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-lg transition-all ${
              activeTab === 'scan'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="truncate">اسکن QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-lg transition-all ${
              activeTab === 'paste'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <Link className="h-4 w-4 shrink-0" />
            <span className="truncate">پیوند URI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-lg transition-all ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">تصویر QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-lg transition-all ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-[#7d2323] to-[#5a1414] text-white shadow-sm'
                : 'text-[#7b6464] hover:text-[#2b1313]'
            }`}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span className="truncate">دستی</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body / Tabs Content */}
        <div className="overflow-y-auto flex-1 pr-1">
          {/* TAB 1: Camera Scanner */}
          {activeTab === 'scan' && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-xs overflow-hidden rounded-2xl border-2 border-[#5a1414] bg-[#2b1313] flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Laser Line */}
                {isScanning && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#d24a3a] to-transparent shadow-[0_0_12px_#d24a3a] animate-pulse" />
                )}

                {/* Target Corners */}
                <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-[#f2c6c6] rounded-xl" />
              </div>
              <p className="mt-3 text-xs text-[#7b6464] text-center">
                کد QR ارائه‌شده توسط سرویس مورد نظر را در کادر بالا قرار دهید.
              </p>
            </div>
          )}

          {/* TAB 2: Paste URI */}
          {activeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2b1313] mb-1.5">
                  آدرس otpauth://
                </label>
                <textarea
                  value={uriInput}
                  onChange={(e) => setUriInput(e.target.value)}
                  placeholder="otpauth://totp/GitHub:user?secret=JBSWY3DPEHPK3PXP&issuer=GitHub"
                  rows={4}
                  dir="ltr"
                  className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] p-3 text-base sm:text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99]"
              >
                {t('save')}
              </button>
            </form>
          )}

          {/* TAB 3: QR Image Upload */}
          {activeTab === 'image' && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#efdcdc] bg-[#fcf2f2] p-6 sm:p-8 text-center hover:border-[#5a1414] transition">
              <ImageIcon className="h-10 w-10 text-[#5a1414] mb-2" />
              <p className="text-sm font-semibold text-[#2b1313] mb-1">
                تصویر کد QR را انتخاب یا بارگذاری کنید
              </p>
              <p className="text-xs text-[#7b6464] mb-4">فرمت‌های PNG، JPG و WebP پشتیبانی می‌شوند</p>
              <label className="cursor-pointer rounded-full bg-white border border-[#efdcdc] px-5 py-2.5 text-xs font-bold text-[#5a1414] hover:bg-[#fffcfc] transition shadow-sm">
                {t('importQrImage')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
            </div>
          )}

          {/* TAB 4: Manual Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                    {t('issuer')}
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder={t('issuerPlaceholder')}
                    className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                    {t('accountName')}
                  </label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={t('accountNamePlaceholder')}
                    className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                  {t('secretKey')} *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={t('secretKeyPlaceholder')}
                  required
                  className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-3.5 py-3 text-base sm:text-xs font-mono text-[#2b1313] placeholder-[#7b6464]/60 focus:bg-white focus:border-[#5a1414] focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                    {t('type')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as OtpType)}
                    className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-2.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
                  >
                    <option value="totp">TOTP (زمان)</option>
                    <option value="hotp">HOTP (شمارنده)</option>
                  </select>
                </div>

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

                <div>
                  <label className="block text-xs font-semibold text-[#2b1313] mb-1">
                    {type === 'totp' ? t('period') : t('counter')}
                  </label>
                  {type === 'totp' ? (
                    <input
                      type="number"
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-2.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      value={counter}
                      onChange={(e) => setCounter(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#efdcdc] bg-[#fcf2f2] px-2.5 py-2.5 text-base sm:text-xs text-[#2b1313] focus:bg-white focus:border-[#5a1414] focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-[#7d2323] via-[#5a1414] to-[#390a0a] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5a1414]/25 hover:brightness-105 transition active:scale-[0.99]"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
