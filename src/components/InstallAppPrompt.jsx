import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';

const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA installability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA service worker registration failed:', err);
      });
    }

    // 2. Check if already running in standalone / installed mode
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );

    if (isStandalone) {
      return; // Already installed as an app
    }

    // 3. Check if user dismissed recently (within 5 days)
    const dismissedTime = localStorage.getItem('tm_pwa_prompt_dismissed');
    if (dismissedTime) {
      const daysSince = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 5) return;
    }

    // 4. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|optios|android/.test(ua);

    if (isAppleDevice && isSafari) {
      setIsIOS(true);
      // Show prompt after brief delay for natural onboarding
      const timer = setTimeout(() => setShowPrompt(true), 3500);
      return () => clearTimeout(timer);
    }

    // 5. Android / Chrome / Chromium `beforeinstallprompt` event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Delay showing prompt slightly so it doesn't interrupt immediate first action
      setTimeout(() => setShowPrompt(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Auto-hide if installed
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback for browsers where install prompt isn't directly interceptable
      alert("To add Trackmeisters to your home screen: Tap your browser's menu (⋮) and select 'Add to Home screen' or 'Install App'.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem('tm_pwa_prompt_dismissed', String(Date.now()));
    } catch (_) {}
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* FLOATING ADD TO HOMESCREEN PROMPT BANNER */}
      <aside
        aria-label="Add to Home Screen"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '14px',
          right: '14px',
          maxWidth: '440px',
          margin: '0 auto',
          zIndex: 9999,
          background: 'rgba(6, 30, 54, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#ffffff',
          animation: 'slideUpPrompt 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>
          {`
            @keyframes slideUpPrompt {
              from { transform: translateY(100%) scale(0.95); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}
        </style>

        {/* App Icon */}
        <img
          src="/icon-192.png"
          alt="Trackmeisters Icon"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
        />

        {/* Text Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '0.3px',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Trackmeisters</span>
            <span style={{
              fontSize: '9px',
              fontWeight: '900',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}>
              App
            </span>
          </div>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            marginTop: '2px',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            1-tap home screen access for events
          </div>
        </div>

        {/* CTA Install Button */}
        <button
          onClick={handleInstallClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: '#38bdf8',
            color: '#02182e',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(56, 189, 248, 0.35)'
          }}
        >
          <Smartphone size={13} strokeWidth={2.5} />
          <span>Add App</span>
        </button>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '50%'
          }}
        >
          <X size={16} />
        </button>
      </aside>

      {/* iOS STEP-BY-STEP ADD TO HOMESCREEN MODAL */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(2, 24, 46, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#061e36',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '24px 20px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
              color: '#f8fafc',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowIOSGuide(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <img
              src="/icon-192.png"
              alt="Trackmeisters"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                margin: '0 auto 12px auto',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
              }}
            />

            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px 0', color: '#ffffff' }}>
              Add Trackmeisters to Home Screen
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Install Trackmeisters to your iPhone / iPad home screen for instant 1-tap event access.
            </p>

            <div style={{
              background: 'rgba(2, 24, 46, 0.7)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0
                }}>
                  <Share size={15} />
                </div>
                <span>1. Tap the <strong>Share</strong> button in Safari's toolbar.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0
                }}>
                  <PlusSquare size={15} />
                </div>
                <span>2. Scroll down and tap <strong>'Add to Home Screen'</strong>.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                  fontSize: '11px',
                  fontWeight: '800',
                  flexShrink: 0
                }}>
                  ADD
                </div>
                <span>3. Tap <strong>Add</strong> in the top right corner.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#38bdf8',
                color: '#02182e',
                fontWeight: '800',
                fontSize: '12px',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppPrompt;

