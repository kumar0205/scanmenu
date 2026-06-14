import { useState, useEffect } from 'react';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(!!(window as any).deferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mediaQuery.matches || (window.navigator as any).standalone === true);

    const handleInstallable = () => {
      setIsInstallable(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    
    // Fallback/direct check in case event was already captured
    if ((window as any).deferredPrompt) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const installApp = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return false;

    // Show the install prompt
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    
    // We've used the prompt, and can't use it again, so clear it
    (window as any).deferredPrompt = null;
    setIsInstallable(false);

    return outcome === 'accepted';
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return {
    isInstallable,
    isStandalone,
    installApp,
    isIOS: isIOS && !isStandalone,
    isSafari
  };
}
