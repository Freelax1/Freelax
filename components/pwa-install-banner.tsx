"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

const STORAGE_KEY = "freedesk-pwa-dismissed";
const DISMISS_DAYS = 30;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function isDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ until: Date.now() + DISMISS_DAYS * 86400 * 1000 })
    );
  } catch {}
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Never show if already installed or dismissed
    if (isInStandaloneMode() || isDismissed()) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // iOS: show after 30s delay (no install event available)
      const t = setTimeout(() => setShow(true), 30000);
      return () => clearTimeout(t);
    } else {
      // Android/Chrome: wait for beforeinstallprompt
      let timer: ReturnType<typeof setTimeout> | null = null;

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        timer = setTimeout(() => setShow(true), 30000);
      };

      window.addEventListener("beforeinstallprompt", handler);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        if (timer) clearTimeout(timer);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        dismiss();
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4 md:max-w-sm md:left-auto md:right-4 md:bottom-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1D6B35] flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Add Freelax to your home screen</p>
          {isIOSDevice ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <span className="font-medium">Share</span> then <span className="font-medium">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Install for faster access — works offline too
            </p>
          )}
          {!isIOSDevice && (
            <button
              onClick={handleInstall}
              className="mt-2 text-xs font-semibold text-[#1D6B35] hover:underline"
            >
              Install now
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 -mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
