'use client';

import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showAppleHint, setShowAppleHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
        // The timetable remains usable online if the browser declines offline caching.
      });
    }

    setInstalled(isStandalone());
    setShowAppleHint(isAppleMobile() && !isStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) return null;

  return (
    <section className="install-card" aria-label="安装班级小站">
      <div className="install-copy">
        <span className="install-icon"><Download size={19} /></span>
        <div>
          <strong>把课表放到桌面</strong>
          <p>{showAppleHint ? '用 Safari 打开后，点分享按钮，再选“添加到主屏幕”。' : '安装后可像 App 一样从主屏幕打开，也会保留最近浏览的课表。'}</p>
        </div>
      </div>
      {installPrompt ? (
        <button className="install-button" type="button" onClick={install}>安装 App</button>
      ) : showAppleHint ? (
        <span className="install-hint"><Share size={16} />添加到主屏幕</span>
      ) : null}
    </section>
  );
}
