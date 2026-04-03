import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from './a11y/useKeyboardShortcuts';
import { bootstrapBabylonScene } from './scene/bootstrapBabylon';

const App = () => {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = useMemo(
    () => [
      { key: '?', description: 'Toggle keyboard help', handler: () => setShowHelp((prev) => !prev) },
      {
        key: 'l',
        description: 'Toggle language',
        handler: () => {
          void i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
        }
      }
    ],
    [i18n]
  );

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    mainRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || canvasRef.current.getContext('webgl') === null) {
      return;
    }

    return bootstrapBabylonScene(canvasRef.current);
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
        <section aria-label={t('sceneTitle')}>
          <canvas ref={canvasRef} aria-label={t('sceneTitle')} className="scene-canvas" />
        </section>
        {showHelp ? (
          <aside aria-live="polite">
            <h3>Keyboard Shortcuts</h3>
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
