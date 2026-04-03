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
      timelineNow: '{{label}} at {{elapsedHours}}h elapsed',
      scenarioLoaded: 'Loaded scenario: {{title}}',
      'scenario.sectionTitle': 'Seeded scenarios',
      'scenario.oneClickHint': 'Load a profile to focus the map, ship form, and timeline in one click.',
      'scenario.assumptionsLabel': 'Assumptions',
      'scenario.nonCanonLabel': 'Non-canon disclaimer:',
      'scenario.realisticPhysics.title': 'Realistic physics profile',
      'scenario.realisticPhysics.summary':
        'Finite-thrust planning route from Sol to Alpha Centauri with conservative margins.',
      'scenario.realisticPhysics.assumptionOne':
        'Finite-thrust ion propulsion with conservative safety reserve.',
      'scenario.realisticPhysics.assumptionTwo':
        'Acceleration and insertion windows are mission-control constrained.',
      'scenario.realisticPhysics.assumptionThree':
        'Cruise segment reflects long-duration coast under known physics.',
      'scenario.realisticPhysics.disclaimer':
        'Non-canon training profile intended for planning practice.',
      'scenario.fictionalDrive.title': 'Fictional drive profile',
      'scenario.fictionalDrive.summary':
        'Speculative high-speed route from Sol to Sirius using an intentionally fictional drive model.',
      'scenario.fictionalDrive.assumptionOne':
        'Speculative quantum lane compression allows superluminal transfer.',
      'scenario.fictionalDrive.assumptionTwo':
        'Navigation lock assumes stable beacons with no drift.',
      'scenario.fictionalDrive.assumptionThree':
        'Insertion burn modeled as deterministic for training UI only.',
      'scenario.fictionalDrive.disclaimer':
        'Non-canon sandbox profile; values are intentionally fictional.'
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
      timelineNow: '{{label}} con {{elapsedHours}}h transcurridas',
      scenarioLoaded: 'Escenario cargado: {{title}}',
      'scenario.sectionTitle': 'Escenarios predefinidos',
      'scenario.oneClickHint':
        'Carga un perfil para enfocar el mapa, formulario de nave y cronología con un clic.',
      'scenario.assumptionsLabel': 'Supuestos',
      'scenario.nonCanonLabel': 'Descargo no canónico:',
      'scenario.realisticPhysics.title': 'Perfil de física realista',
      'scenario.realisticPhysics.summary':
        'Ruta de planificación de empuje finito de Sol a Alfa Centauri con márgenes conservadores.',
      'scenario.realisticPhysics.assumptionOne':
        'Propulsión iónica de empuje finito con reserva de seguridad conservadora.',
      'scenario.realisticPhysics.assumptionTwo':
        'Las ventanas de aceleración e inserción están limitadas por control de misión.',
      'scenario.realisticPhysics.assumptionThree':
        'El tramo de crucero refleja una costa de larga duración bajo física conocida.',
      'scenario.realisticPhysics.disclaimer':
        'Perfil de entrenamiento no canónico destinado a práctica de planificación.',
      'scenario.fictionalDrive.title': 'Perfil de motor ficticio',
      'scenario.fictionalDrive.summary':
        'Ruta especulativa de alta velocidad de Sol a Sirio con un modelo de motor intencionalmente ficticio.',
      'scenario.fictionalDrive.assumptionOne':
        'La compresión cuántica especulativa permite transferencia superlumínica.',
      'scenario.fictionalDrive.assumptionTwo':
        'El bloqueo de navegación supone balizas estables sin deriva.',
      'scenario.fictionalDrive.assumptionThree':
        'La quema de inserción se modela como determinista solo para entrenamiento UI.',
      'scenario.fictionalDrive.disclaimer':
        'Perfil sandbox no canónico; los valores son intencionalmente ficticios.'
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
