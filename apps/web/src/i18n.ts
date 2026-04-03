import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appTitle: 'HailMary Navigator',
      tagline: 'Accessible interstellar routing console',
      sceneTitle: 'Galaxy viewport',
      skipToMain: 'Skip to main content',
      keyboardHelp: 'Press ? to open keyboard shortcut help.',
      mainHeading: 'Navigation workspace',
      shortcutTitle: 'Keyboard Shortcuts',
      shortcutHelp: 'Toggle keyboard help',
      shortcutLanguage: 'Toggle language',
      starPicker: 'Star picking list',
      routeOverlay: 'Route overlay rendering',
      detailPanel: 'Star detail panel',
      constellation: 'Constellation',
      magnitude: 'Magnitude',
      distanceLy: 'Distance (ly)',
      routeStart: 'Route start',
      routeEnd: 'Route destination',
      routeInvalid: 'Choose different start and destination stars.',
      routeSolved_one: 'Solved route with {{count}} maneuver segment.',
      routeSolved_other: 'Solved route with {{count}} maneuver segments.',
      routeFailed: 'Route solver unavailable. Please try again.',
      shipFormTitle: 'Ship parameters',
      shipPresets: 'Ship presets',
      shipValidationError: 'Please correct ship parameters before solving the route.',
      shipSubmit: 'Solve route',
      shipSubmitting: 'Solving route…',
      engineClass: 'Engine class',
      cargoMass: 'Cargo mass (tons)',
      maxBurnHours: 'Max burn hours',
      safetyMargin: 'Safety margin (%)',
      'engine.ion': 'Ion',
      'engine.warp': 'Warp',
      'engine.quantum': 'Quantum',
      'preset.scout': 'Scout',
      'preset.freighter': 'Freighter',
      'preset.explorer': 'Explorer',
      timelineTitle: 'Mission timeline',
      timelineEmpty: 'No route solved yet.',
      timelineScrubber: 'Timeline scrubber',
      timelineNow: '{{label}} at {{elapsedHours}}h elapsed'
    }
  },
  es: {
    translation: {
      appTitle: 'Navegador HailMary',
      tagline: 'Consola accesible de rutas interestelares',
      sceneTitle: 'Visor de galaxia',
      skipToMain: 'Saltar al contenido principal',
      keyboardHelp: 'Pulsa ? para abrir la ayuda de atajos de teclado.',
      mainHeading: 'Espacio de navegación',
      shortcutTitle: 'Atajos de teclado',
      shortcutHelp: 'Mostrar ayuda de teclado',
      shortcutLanguage: 'Cambiar idioma',
      starPicker: 'Lista de selección de estrellas',
      routeOverlay: 'Superposición de ruta',
      detailPanel: 'Panel de detalle de estrella',
      constellation: 'Constelación',
      magnitude: 'Magnitud',
      distanceLy: 'Distancia (al)',
      routeStart: 'Origen de la ruta',
      routeEnd: 'Destino de la ruta',
      routeInvalid: 'Elige estrellas distintas para origen y destino.',
      routeSolved_one: 'Ruta resuelta con {{count}} maniobra.',
      routeSolved_other: 'Ruta resuelta con {{count}} maniobras.',
      routeFailed: 'El solucionador de rutas no está disponible. Inténtalo de nuevo.',
      shipFormTitle: 'Parámetros de la nave',
      shipPresets: 'Preajustes de nave',
      shipValidationError: 'Corrige los parámetros de la nave antes de resolver la ruta.',
      shipSubmit: 'Resolver ruta',
      shipSubmitting: 'Resolviendo ruta…',
      engineClass: 'Clase de motor',
      cargoMass: 'Masa de carga (toneladas)',
      maxBurnHours: 'Horas máximas de combustión',
      safetyMargin: 'Margen de seguridad (%)',
      'engine.ion': 'Iónico',
      'engine.warp': 'Warp',
      'engine.quantum': 'Cuántico',
      'preset.scout': 'Explorador ligero',
      'preset.freighter': 'Carguero',
      'preset.explorer': 'Explorador',
      timelineTitle: 'Cronología de misión',
      timelineEmpty: 'Todavía no hay una ruta resuelta.',
      timelineScrubber: 'Control de cronología',
      timelineNow: '{{label}} con {{elapsedHours}}h transcurridas'
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
