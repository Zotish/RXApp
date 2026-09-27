import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import './InstallPrompt.css';

export default function InstallPrompt({ language = 'en' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  const isBn = language === 'bn';

  useEffect(() => {
    // Check if already installed in standalone mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneMode);

    // Detect iOS device (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(iOSDevice);

    // Capture beforeinstallprompt for Android / Chrome / Edge / Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // If user hasn't dismissed the banner in this session, show it after a brief delay
      const dismissed = sessionStorage.getItem('veda_pwa_dismissed');
      if (!dismissed && !standaloneMode) {
        setTimeout(() => setShowBanner(true), 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('veda_pwa_dismissed', 'true');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for manual trigger from settings or navbar
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowBanner(false);
          }
        });
      } else if (iOSDevice && !standaloneMode) {
        setShowIOSGuide(true);
      } else {
        setShowBanner(true);
      }
    };
    window.addEventListener('veda-trigger-install', handleManualTrigger);

    // Online / Offline tracking
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      setTimeout(() => setJustCameOnline(false), 3500);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SW update available event
    const handleUpdate = () => {
      setHasUpdate(true);
    };
    window.addEventListener('veda-sw-update-available', handleUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('veda-trigger-install', handleManualTrigger);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('veda-sw-update-available', handleUpdate);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('veda_pwa_dismissed', 'true');
  };

  const reloadApp = () => {
    window.location.reload();
  };

  // If already standalone and no network/update alerts, return null
  if (isStandalone && !isOffline && !justCameOnline && !hasUpdate) {
    return null;
  }

  return (
    <>
      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="pwa-offline-bar" role="status" aria-live="polite">
          <WifiOff size={16} />
          <span>
            {isBn
              ? 'আপনি অফলাইনে আছেন। পূর্বের ফার্স্ট এইড ও লক্ষণ গাইড কাজ করছে।'
              : 'You are offline. First aid guides & cached health tools are still available.'}
          </span>
        </div>
      )}

      {/* ── Back Online Banner ── */}
      {justCameOnline && (
        <div className="pwa-online-bar" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{isBn ? 'ইন্টারনেট সংযোগ পুনরায় সক্রিয় হয়েছে!' : 'Back online! Reconnected successfully.'}</span>
        </div>
      )}

      {/* ── App Update Toast ── */}
      {hasUpdate && (
        <div className="pwa-update-toast" role="alert">
          <div className="pwa-update-text">
            <strong>{isBn ? 'নতুন সংস্করণ উপলব্ধ' : 'New Version Available'}</strong>
            <p>{isBn ? 'আপডেট প্রয়োগ করতে অ্যাপটি রিলোড করুন।' : 'Reload to get the latest features and fixes.'}</p>
          </div>
          <button className="pwa-reload-btn" onClick={reloadApp}>
            <RefreshCw size={15} />
            <span>{isBn ? 'রিলোড' : 'Reload'}</span>
          </button>
        </div>
      )}

      {/* ── Install Floating Banner (Desktop & Mobile) ── */}
      {showBanner && !isStandalone && (deferredPrompt || isIOS) && (
        <aside className="pwa-install-banner" aria-label="Install App Prompt">
          <button className="pwa-banner-close" onClick={handleDismiss} aria-label={isBn ? 'বন্ধ করুন' : 'Close'}>
            <X size={18} />
          </button>
          <div className="pwa-banner-content">
            <div className="pwa-banner-icon-box">
              <img src="/pwa-192x192.png" alt="Veda Logo" className="pwa-banner-logo" />
            </div>
            <div className="pwa-banner-copy">
              <div className="pwa-banner-tag">{isBn ? 'অফিসিয়াল অ্যাপ' : 'Official App'}</div>
              <h4 className="pwa-banner-title">
                {isBn ? 'Veda – Home Doctor অ্যাপ ইনস্টল করুন' : 'Install Veda – Home Doctor'}
              </h4>
              <p className="pwa-banner-desc">
                {isBn
                  ? 'দ্রুত অ্যাক্সেস, অফলাইন ফার্স্ট এইড এবং ওষুধের রিমাইন্ডারের জন্য ইনস্টল করুন।'
                  : 'Fast 1-tap access, offline first aid guides & timely medicine reminders.'}
              </p>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="pwa-banner-btn-secondary" onClick={handleDismiss}>
              {isBn ? 'পরে' : 'Maybe Later'}
            </button>
            <button className="pwa-banner-btn-primary" onClick={handleInstallClick}>
              <Download size={16} />
              <span>{isBn ? 'ইনস্টল করুন' : 'Install App'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* ── iOS Add-To-Home-Screen Instructions Modal ── */}
      {showIOSGuide && (
        <div className="pwa-modal-backdrop" onClick={() => setShowIOSGuide(false)}>
          <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-header">
              <div className="pwa-ios-title-wrap">
                <Smartphone size={22} className="pwa-ios-icon" />
                <h3>{isBn ? 'আইফোনে অ্যাপ ইনস্টল করুন' : 'Install on iPhone / iPad'}</h3>
              </div>
              <button className="pwa-modal-close" onClick={() => setShowIOSGuide(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="pwa-ios-steps">
              <div className="pwa-step-item">
                <span className="pwa-step-number">1</span>
                <div className="pwa-step-text">
                  <p>
                    {isBn ? 'Safari ব্রাউজারের নিচে ' : 'Tap the '}
                    <strong>{isBn ? 'শেয়ার বাটন (Share)' : 'Share button'}</strong>
                    <Share size={16} className="inline-icon" />
                    {isBn ? ' চাপুন।' : ' in Safari toolbar.'}
                  </p>
                </div>
              </div>

              <div className="pwa-step-item">
                <span className="pwa-step-number">2</span>
                <div className="pwa-step-text">
                  <p>
                    {isBn ? 'তালিকাটি স্ক্রোল করে ' : 'Scroll down and tap '}
                    <strong>{isBn ? '"Add to Home Screen"' : '"Add to Home Screen"'}</strong>
                    <PlusSquare size={16} className="inline-icon" />
                    {isBn ? ' অপশন সিলেক্ট করুন।' : '.'}
                  </p>
                </div>
              </div>

              <div className="pwa-step-item">
                <span className="pwa-step-number">3</span>
                <div className="pwa-step-text">
                  <p>
                    {isBn ? 'উপরে ডানদিকে ' : 'Tap '}
                    <strong>{isBn ? '"Add"' : '"Add"'}</strong>
                    {isBn
                      ? ' চাপলে আপনার হোম স্ক্রিনে Veda যোগ হয়ে যাবে!'
                      : ' in the top right to complete installation!'}
                  </p>
                </div>
              </div>
            </div>

            <button className="pwa-ios-done-btn" onClick={() => setShowIOSGuide(false)}>
              {isBn ? 'বুঝেছি' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
