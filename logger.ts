/**
 * Production Logger
 * Remplace console.log par un logger conditionnel qui ne s'active qu'en mode développement
 * Usage: Importer ce fichier au début de App.tsx pour désactiver tous les logs en production
 */

// Désactiver tous les logs en production
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  
  // Garder console.error pour le monitoring de production (Sentry, etc.)
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // En production, logger uniquement les erreurs critiques
    // et les envoyer à un service de monitoring si configuré
    originalError.apply(console, args);
    
    // TODO: Intégrer avec Sentry ou autre service de monitoring
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(new Error(args.join(' ')));
    // }
  };
}

export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (__DEV__) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug(...args);
    }
  }
};
