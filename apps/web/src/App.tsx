import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from './a11y/useKeyboardShortcuts';
import { GalaxyWorkspace } from './features/galaxy/GalaxyWorkspace';

const App = () => {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = useMemo(
    () => [
      { key: '?', description: t('shortcutHelp'), handler: () => setShowHelp((prev) => !prev) },
    ],
    [t],
  );

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    mainRef.current?.focus();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('skipToMain')}
      </a>
      <header role="banner">
        <h1>{t('appTitle')}</h1>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <GalaxyWorkspace />
      </main>
      <footer role="contentinfo">{t('footerText', { year: new Date().getFullYear() })}</footer>
      {showHelp && (
        <aside className="keyboard-help" aria-live="polite">
          <h3>{t('shortcutTitle')}</h3>
          <ul>
            {shortcuts.map((shortcut) => (
              <li key={shortcut.key}>
                <kbd>{shortcut.key}</kbd>: {shortcut.description}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
};

export default App;
