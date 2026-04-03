import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  handler: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (event.key === shortcut.key) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
};
