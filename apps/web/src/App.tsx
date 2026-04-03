import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from './a11y/useKeyboardShortcuts';
import { GalaxyWorkspace } from './features/galaxy/GalaxyWorkspace';

const App = () => {
  const { t, i18n } = useTranslation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = useMemo(
    () => [
      { key: '?', description: t('shortcutHelp'), handler: () => setShowHelp((prev) => !prev) },
      {
        key: 'l',
        description: t('shortcutLanguage'),
        handler: () => {
          void i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
        }
      }
    ],
    [i18n, t]
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
        <p>{t('tagline')}</p>
      </header>
      <nav aria-label="utility">
        <button type="button" onClick={() => void i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}>
          {i18n.language.toUpperCase()}
        </button>
      </nav>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <h2>{t('mainHeading')}</h2>
        <p>{t('keyboardHelp')}</p>
        <GalaxyWorkspace />
        {showHelp ? (
          <aside aria-live="polite">
            <h3>{t('shortcutTitle')}</h3>
            <ul>
              {shortcuts.map((shortcut) => (
                <li key={shortcut.key}>
                  <kbd>{shortcut.key}</kbd>: {shortcut.description}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </main>
      <footer role="contentinfo">© HailMary</footer>
    </>
  );
};

export default App;
