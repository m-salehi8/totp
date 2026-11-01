import React, { createContext, useContext, useEffect } from 'react';
import { translations, type TranslationKey } from './translations';

interface I18nContextType {
  dir: 'rtl';
  locale: 'fa';
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  useEffect(() => {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
    document.documentElement.classList.add('dark');
  }, []);

  const t = (key: TranslationKey, ...args: (string | number)[]): string => {
    let str = translations[key] || key;
    if (args.length > 0) {
      args.forEach((arg, i) => {
        str = str.replace(`{${i}}`, arg.toString());
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ dir: 'rtl', locale: 'fa', t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
