import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isVisible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    setIsVisible(false);
    if (choice.outcome === 'accepted') {
      window.dispatchEvent(new Event('together-events-app-installed'));
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:left-auto sm:right-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
        <Download size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Install Together Events</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Add it to your phone like a proper app.</p>
      </div>
      <button onClick={install} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">Install</button>
      <button onClick={() => setIsVisible(false)} aria-label="Dismiss install prompt" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">
        <X size={17} />
      </button>
    </div>
  );
}
