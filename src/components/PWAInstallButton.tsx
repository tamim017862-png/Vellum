import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[12.5px] font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Install Vellum for offline PDF processing"
      >
        <Download className="w-3.5 h-3.5 text-blue-400" />
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[12.5px] font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Install Vellum on iPhone or iPad"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Install Offline App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#0B1120] text-white border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-blue-400">
                    Offline Web App
                  </p>
                  <h3
                    id="ios-install-title"
                    className="font-display text-[18px] font-bold mt-1"
                  >
                    Install Vellum on iOS
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation instructions"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-[13.5px] text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400 font-semibold">
                    01.
                  </span>
                  <span>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 text-white font-semibold">
                      <Share className="w-3.5 h-3.5" /> Share
                    </span>{' '}
                    button in your Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400 font-semibold">
                    02.
                  </span>
                  <span>
                    Scroll down and select{' '}
                    <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[40px] rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
