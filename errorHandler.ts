/**
 * Gestionnaire d'erreurs global pour l'application
 * Évite les crashes et log les erreurs pour debugging
 */

import { Alert } from 'react-native';

// Type d'erreurs
export enum ErrorType {
  NETWORK = 'NETWORK',
  BLUETOOTH = 'BLUETOOTH',
  FIREBASE = 'FIREBASE',
  OPENAI = 'OPENAI',
  OBD2 = 'OBD2',
  CAMERA = 'CAMERA',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

interface ErrorLog {
  type: ErrorType;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: any;
}

class ErrorHandler {
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100; // Limite mémoire

  /**
   * Enregistre une erreur
   */
  log(type: ErrorType, error: Error | string, context?: any) {
    const errorLog: ErrorLog = {
      type,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      timestamp: new Date(),
      context,
    };

    // Ajoute au log
    this.errorLogs.push(errorLog);

    // Limite la taille du log
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift();
    }

    // Log console en dev
    if (__DEV__) {
      console.error(`[${type}] ${errorLog.message}`, {
        stack: errorLog.stack,
        context,
      });
    }

    // TODO: Envoyer à un service de monitoring en production (Sentry, Firebase Crashlytics)
    // if (!__DEV__) {
    //   this.sendToMonitoring(errorLog);
    // }
  }

  /**
   * Affiche une erreur à l'utilisateur
   */
  showUserError(title: string, message: string, onRetry?: () => void) {
    const buttons: any[] = [{ text: 'OK', style: 'cancel' }];
    
    if (onRetry) {
      buttons.push({ text: 'Réessayer', onPress: onRetry });
    }

    Alert.alert(title, message, buttons);
  }

  /**
   * Gère une erreur réseau
   */
  handleNetworkError(error: Error, onRetry?: () => void) {
    this.log(ErrorType.NETWORK, error);
    this.showUserError(
      'Erreur réseau',
      'Vérifiez votre connexion internet et réessayez.',
      onRetry
    );
  }

  /**
   * Gère une erreur Bluetooth
   */
  handleBluetoothError(error: Error, onRetry?: () => void) {
    this.log(ErrorType.BLUETOOTH, error);
    this.showUserError(
      'Erreur Bluetooth',
      'Vérifiez que le Bluetooth est activé et que l\'appareil est à proximité.',
      onRetry
    );
  }

  /**
   * Gère une erreur OBD2
   */
  handleOBD2Error(error: Error, context?: any, onRetry?: () => void) {
    this.log(ErrorType.OBD2, error, context);
    this.showUserError(
      'Erreur scanner OBD2',
      'Impossible de lire les données du véhicule. Vérifiez la connexion et que le contact est mis.',
      onRetry
    );
  }

  /**
   * Gère une erreur Firebase
   */
  handleFirebaseError(error: Error, context?: any) {
    this.log(ErrorType.FIREBASE, error, context);
    
    // Messages spécifiques selon le code d'erreur
    let message = 'Une erreur est survenue. Réessayez plus tard.';
    
    if (error.message.includes('network')) {
      message = 'Vérifiez votre connexion internet.';
    } else if (error.message.includes('permission')) {
      message = 'Vous n\'avez pas les permissions nécessaires.';
    } else if (error.message.includes('auth')) {
      message = 'Session expirée. Reconnectez-vous.';
    }

    this.showUserError('Erreur', message);
  }

  /**
   * Gère une erreur OpenAI
   */
  handleOpenAIError(error: Error, context?: any) {
    this.log(ErrorType.OPENAI, error, context);
    
    let message = 'Impossible d\'analyser le document.';
    
    if (error.message.includes('401') || error.message.includes('Invalid API key')) {
      message = 'Erreur de configuration. Contactez le support.';
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      message = 'Trop de requêtes. Réessayez dans quelques minutes.';
    } else if (error.message.includes('network')) {
      message = 'Vérifiez votre connexion internet.';
    }

    this.showUserError('Erreur analyse', message);
  }

  /**
   * Récupère les logs (pour debug ou support)
   */
  getLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Efface les logs
   */
  clearLogs() {
    this.errorLogs = [];
  }

  /**
   * Exporte les logs en JSON (pour envoi au support)
   */
  exportLogs(): string {
    return JSON.stringify(this.errorLogs, null, 2);
  }

  // TODO: Implémenter en production
  // private sendToMonitoring(errorLog: ErrorLog) {
  //   // Sentry.captureException(...)
  //   // ou Firebase Crashlytics
  // }
}

// Singleton
export const errorHandler = new ErrorHandler();

/**
 * Wrapper async avec gestion d'erreur automatique
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorType: ErrorType,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    errorHandler.log(errorType, error);
    if (onError) {
      onError(error);
    }
    return null;
  }
}
