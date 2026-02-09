/**
 * SERVICE D'INITIALISATION OFFLINE-FIRST
 * 
 * Point d'entrée unique pour initialiser tous les services offline.
 * À appeler au démarrage de l'application.
 */

import { NetworkMonitor } from './NetworkMonitor';
import { OfflineQueue } from './OfflineQueue';
import { SafetyRoundOfflineService } from './SafetyRoundOfflineService';

class OfflineManagerService {
  private isInitialized = false;

  /**
   * Initialiser tous les services offline
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ OfflineManager déjà initialisé');
      return;
    }

    console.log('🚀 Démarrage OfflineManager...');

    try {
      // 1. NetworkMonitor (doit être premier)
      NetworkMonitor.initialize();
      console.log('✅ [1/3] NetworkMonitor initialisé');

      // 2. OfflineQueue
      await OfflineQueue.initialize();
      console.log('✅ [2/3] OfflineQueue initialisé');

      // 3. SafetyRoundOfflineService
      await SafetyRoundOfflineService.initialize();
      console.log('✅ [3/3] SafetyRoundOfflineService initialisé');

      this.isInitialized = true;
      console.log('✅ OfflineManager prêt');

      // Log de l'état initial
      this.logStatus();
    } catch (error) {
      console.error('❌ Erreur initialisation OfflineManager:', error);
      throw error;
    }
  }

  /**
   * Afficher le statut de tous les services
   */
  private logStatus(): void {
    const networkStatus = NetworkMonitor.getStatus();
    const queueStats = OfflineQueue.getStats();

    console.log('\n📊 État Offline Manager:');
    console.log(`  Réseau: ${networkStatus}`);
    console.log(`  Queue: ${queueStats.totalItems} items (${queueStats.pendingItems} en attente)`);
    console.log('');
  }

  /**
   * Forcer la synchronisation maintenant
   */
  async forceSyncNow(): Promise<void> {
    if (!NetworkMonitor.isOnline()) {
      throw new Error('Impossible de synchroniser : hors ligne');
    }

    console.log('🔄 Synchronisation forcée...');
    await OfflineQueue.forceSyncNow();
  }

  /**
   * Obtenir le statut complet
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      network: NetworkMonitor.getStatus(),
      queue: OfflineQueue.getStats()
    };
  }

  /**
   * Cleanup - Arrêter tous les services
   */
  destroy(): void {
    NetworkMonitor.destroy();
    OfflineQueue.destroy();
    this.isInitialized = false;
    console.log('🛑 OfflineManager arrêté');
  }
}

// Instance singleton
export const OfflineManager = new OfflineManagerService();
