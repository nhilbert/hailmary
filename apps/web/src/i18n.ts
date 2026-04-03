import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appTitle: 'HailMary Navigator',
      tagline: 'Accessible interstellar routing console',
      sceneTitle: 'Babylon scene',
      skipToMain: 'Skip to main content',
      keyboardHelp: 'Press ? to open keyboard shortcut help.',
      mainHeading: 'Navigation workspace'
    }
  },
  es: {
    translation: {
      appTitle: 'Navegador HailMary',
      tagline: 'Consola accesible de rutas interestelares',
      sceneTitle: 'Escena de Babylon',
      skipToMain: 'Saltar al contenido principal',
      keyboardHelp: 'Pulsa ? para abrir la ayuda de atajos de teclado.',
      mainHeading: 'Espacio de navegación'
    }
  }
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
