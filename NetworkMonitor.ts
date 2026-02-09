/**
 * SERVICE DE SURVEILLANCE RÉSEAU
 * 
 * Détecte l'état de connexion internet (online/offline)
 * et notifie l'application des changements.
 * 
 * Fonctionnalités :
 * - Détection état réseau en temps réel
 * - Listeners pour réagir aux changements
 * - Compatible React Native (NetInfo)
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkListener {
  id: string;
  callback: (status: NetworkStatus) => void;
}

class NetworkMonitorService {
  private currentStatus: NetworkStatus = 'unknown';
  private listeners: Map<string, (status: NetworkStatus) => void> = new Map();
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialiser la surveillance réseau
   */
  initialize(): void {
    if (this.unsubscribe) {
      console.log('ℹ️ NetworkMonitor déjà initialisé');
      return;
    }

    console.log('🔌 Initialisation NetworkMonitor');

    // S'abonner aux changements d'état réseau
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const newStatus = this.determineStatus(state);
      
      if (newStatus !== this.currentStatus) {
        const previousStatus = this.currentStatus;
        this.currentStatus = newStatus;
        
        console.log(`🔌 Changement réseau: ${previousStatus} → ${newStatus}`);
        
        // Notifier tous les listeners
        this.notifyListeners(newStatus);
      }
    });

    // Vérifier l'état initial
    this.checkInitialStatus();
  }

  /**
   * Vérifier l'état réseau initial
   */
  private async checkInitialStatus(): Promise<void> {
    try {
      const state = await NetInfo.fetch();
      this.currentStatus = this.determineStatus(state);
      console.log(`🔌 État réseau initial: ${this.currentStatus}`);
      this.notifyListeners(this.currentStatus);
    } catch (error) {
      console.error('❌ Erreur vérification réseau initial:', error);
      this.currentStatus = 'unknown';
    }
  }

  /**
   * Déterminer le statut à partir de l'état NetInfo
   */
  private determineStatus(state: NetInfoState): NetworkStatus {
    if (state.isConnected === true && state.isInternetReachable === true) {
      return 'online';
    } else if (state.isConnected === false || state.isInternetReachable === false) {
      return 'offline';
    }
    return 'unknown';
  }

  /**
   * Obtenir le statut actuel
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * Vérifier si en ligne
   */
  isOnline(): boolean {
    return this.currentStatus === 'online';
  }

  /**
   * Vérifier si hors ligne
   */
  isOffline(): boolean {
    return this.currentStatus === 'offline';
  }

  /**
   * Ajouter un listener
   */
  addListener(id: string, callback: (status: NetworkStatus) => void): void {
    this.listeners.set(id, callback);
    console.log(`✅ Listener réseau ajouté: ${id}`);
    
    // Notifier immédiatement du statut actuel
    callback(this.currentStatus);
  }

  /**
   * Retirer un listener
   */
  removeListener(id: string): void {
    const removed = this.listeners.delete(id);
    if (removed) {
      console.log(`🗑️ Listener réseau retiré: ${id}`);
    }
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach((callback, id) => {
      try {
        callback(status);
      } catch (error) {
        console.error(`❌ Erreur lors de la notification du listener ${id}:`, error);
      }
    });
  }

  /**
   * Forcer une vérification de l'état réseau
   */
  async refresh(): Promise<NetworkStatus> {
    try {
      const state = await NetInfo.fetch();
      const newStatus = this.determineStatus(state);
      
      if (newStatus !== this.currentStatus) {
        this.currentStatus = newStatus;
        console.log(`🔄 État réseau mis à jour: ${newStatus}`);
        this.notifyListeners(newStatus);
      }
      
      return newStatus;
    } catch (error) {
      console.error('❌ Erreur refresh réseau:', error);
      return this.currentStatus;
    }
  }

  /**
   * Cleanup - Arrêter la surveillance
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log('🔌 NetworkMonitor arrêté');
    }
    
    this.listeners.clear();
  }
}

// Instance singleton
export const NetworkMonitor = new NetworkMonitorService();
