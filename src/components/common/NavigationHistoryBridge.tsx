import { useEffect } from 'react';

const HISTORY_KEY = 'together-events-navigation';

type NavigationState = {
  key: typeof HISTORY_KEY;
  tab: string;
};

const isNavigationState = (value: unknown): value is NavigationState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<NavigationState>;
  return state.key === HISTORY_KEY && typeof state.tab === 'string';
};

export function NavigationHistoryBridge() {
  useEffect(() => {
    const currentState = window.history.state;
    if (!isNavigationState(currentState)) {
      window.history.replaceState(
        { key: HISTORY_KEY, tab: 'dashboard' } satisfies NavigationState,
        '',
        window.location.href,
      );
    }

    let restoringFromBack = false;

    const handleNavigationClick = (event: MouseEvent) => {
      if (restoringFromBack) return;
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('[id^="nav-"]');
      if (!button) return;

      const tab = button.id.replace(/^nav-/, '');
      if (!tab) return;

      const current = window.history.state;
      if (isNavigationState(current) && current.tab === tab) return;

      window.history.pushState(
        { key: HISTORY_KEY, tab } satisfies NavigationState,
        '',
        window.location.href,
      );
    };

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!isNavigationState(state)) return;

      const button = document.getElementById(`nav-${state.tab}`) as HTMLButtonElement | null;
      if (!button) return;

      restoringFromBack = true;
      button.click();
      window.setTimeout(() => {
        restoringFromBack = false;
      }, 0);
    };

    document.addEventListener('click', handleNavigationClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
