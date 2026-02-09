/**
 * SERVICE DE FILE D'ATTENTE OFFLINE
 * 
 * Gère la persistance locale des données quand le réseau est absent.
 * Synchronise automatiquement quand le réseau revient.
 * 
 * Architecture :
 * - AsyncStorage pour persistance locale
 * - File d'attente FIFO pour synchronisation
 * - Retry automatique avec backoff exponentiel
 * - Notifications de progression
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkMonitor, NetworkStatus } from './NetworkMonitor';

// ============================================
// TYPES
// ============================================

export interface QueueItem {
  id: string;
  type: 'safety_round' | 'accident' | 'document' | 'expense' | 'income';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

export interface QueueStats {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  syncedItems: number;
}

export type QueueListener = (stats: QueueStats) => void;
export type SyncHandler = (item: QueueItem) => Promise<void>;

// ============================================
// SERVICE
// ============================================

class OfflineQueueService {
  private static readonly STORAGE_KEY = '@offline_queue';
  private static readonly MAX_RETRY_DELAY_MS = 30000; // 30 secondes max
  
  private queue: QueueItem[] = [];
  private syncHandlers: Map<string, SyncHandler> = new Map();
  private listeners: Map<string, QueueListener> = new Map();
  private isSyncing = false;
  private isInitialized = false;

  /**
   * Initialiser le service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ OfflineQueue déjà initialisé');
      return;
    }

    console.log('📦 Initialisation OfflineQueue');

    try {
      // Charger la queue depuis AsyncStorage
      await this.loadQueue();

      // Écouter les changements de connexion
      NetworkMonitor.addListener('offline-queue', (status: NetworkStatus) => {
        if (status === 'online') {
          console.log('🌐 Réseau détecté, démarrage synchronisation...');
          this.startSync();
        }
      });

      this.isInitialized = true;
      console.log(`✅ OfflineQueue initialisé (${this.queue.length} items en attente)`);

      // Si en ligne, tenter la synchronisation
      if (NetworkMonitor.isOnline()) {
        this.startSync();
      }
    } catch (error) {
      console.error('❌ Erreur initialisation OfflineQueue:', error);
    }
  }

  /**
   * Charger la queue depuis AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(OfflineQueueService.STORAGE_KEY);
      if (json) {
        this.queue = JSON.parse(json);
        console.log(`📦 Queue chargée: ${this.queue.length} items`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement queue:', error);
      this.queue = [];
    }
  }

  /**
   * Sauvegarder la queue dans AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      const json = JSON.stringify(this.queue);
      await AsyncStorage.setItem(OfflineQueueService.STORAGE_KEY, json);
    } catch (error) {
      console.error('❌ Erreur sauvegarde queue:', error);
    }
  }

  /**
   * Ajouter un item à la queue
   */
  async enqueue(
    type: QueueItem['type'],
    data: any,
    maxRetries: number = 5
  ): Promise<string> {
    const item: QueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    this.queue.push(item);
    await this.saveQueue();

    console.log(`➕ Item ajouté à la queue: ${item.id} (type: ${type})`);
    this.notifyListeners();

    // Si en ligne, démarrer la synchronisation immédiatement
    if (NetworkMonitor.isOnline()) {
      this.startSync();
    }

    return item.id;
  }

  /**
   * Enregistrer un handler de synchronisation pour un type
   */
  registerSyncHandler(type: QueueItem['type'], handler: SyncHandler): void {
    this.syncHandlers.set(type, handler);
    console.log(`✅ Handler enregistré pour: ${type}`);
  }

  /**
   * Démarrer la synchronisation
   */
  private async startSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('ℹ️ Synchronisation déjà en cours');
      return;
    }

    if (this.queue.length === 0) {
      console.log('ℹ️ Queue vide, rien à synchroniser');
      return;
    }

    if (!NetworkMonitor.isOnline()) {
      console.log('📵 Hors ligne, synchronisation reportée');
      return;
    }

    this.isSyncing = true;
    console.log(`🔄 Début synchronisation (${this.queue.length} items)`);

    // Créer une copie de la queue pour éviter les modifications concurrentes
    const itemsToSync = [...this.queue];
    const successfulIds: string[] = [];
    const failedItems: QueueItem[] = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        successfulIds.push(item.id);
        console.log(`✅ Synchronisé: ${item.id}`);
      } catch (error: any) {
        console.error(`❌ Échec synchronisation ${item.id}:`, error.message);
        
        item.retryCount++;
        item.lastError = error.message;

        if (item.retryCount < item.maxRetries) {
          // Ajouter à la liste des échecs (réessayer plus tard)
          failedItems.push(item);
        } else {
          console.error(`❌ Item abandonné après ${item.maxRetries} tentatives: ${item.id}`);
        }
      }

      // Vérifier si toujours en ligne
      if (!NetworkMonitor.isOnline()) {
        console.log('📵 Connexion perdue, arrêt synchronisation');
        
        // Remettre les items non traités dans la queue
        const remainingItems = itemsToSync.slice(itemsToSync.indexOf(item) + 1);
        failedItems.push(...remainingItems);
        break;
      }
    }

    // Mettre à jour la queue : retirer les succès, garder les échecs
    this.queue = this.queue.filter(item => !successfulIds.includes(item.id));
    this.queue.push(...failedItems);
    
    await this.saveQueue();
    this.notifyListeners();

    console.log(`✅ Synchronisation terminée: ${successfulIds.length} succès, ${failedItems.length} échecs`);
    
    this.isSyncing = false;

    // Si des items ont échoué et que nous sommes toujours en ligne, réessayer après un délai
    if (failedItems.length > 0 && NetworkMonitor.isOnline()) {
      const delay = Math.min(
        1000 * Math.pow(2, failedItems[0].retryCount),
        OfflineQueueService.MAX_RETRY_DELAY_MS
      );
      console.log(`⏱️ Nouvelle tentative dans ${delay}ms`);
      setTimeout(() => this.startSync(), delay);
    }
  }

  /**
   * Synchroniser un item individuel
   */
  private async syncItem(item: QueueItem): Promise<void> {
    const handler = this.syncHandlers.get(item.type);

    if (!handler) {
      throw new Error(`Aucun handler enregistré pour le type: ${item.type}`);
    }

    await handler(item);
  }

  /**
   * Ajouter un listener pour les mises à jour de stats
   */
  addListener(id: string, callback: QueueListener): void {
    this.listeners.set(id, callback);
    console.log(`✅ Listener queue ajouté: ${id}`);
    
    // Notifier immédiatement
    callback(this.getStats());
  }

  /**
   * Retirer un listener
   */
  removeListener(id: string): void {
    const removed = this.listeners.delete(id);
    if (removed) {
      console.log(`🗑️ Listener queue retiré: ${id}`);
    }
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((callback, id) => {
      try {
        callback(stats);
      } catch (error) {
        console.error(`❌ Erreur notification listener ${id}:`, error);
      }
    });
  }

  /**
   * Obtenir les statistiques de la queue
   */
  getStats(): QueueStats {
    const failedItems = this.queue.filter(item => item.retryCount >= item.maxRetries);
    
    return {
      totalItems: this.queue.length,
      pendingItems: this.queue.length - failedItems.length,
      failedItems: failedItems.length,
      syncedItems: 0 // Calculé ailleurs si nécessaire
    };
  }

  /**
   * Vider la queue (pour tests ou reset)
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    console.log('🗑️ Queue vidée');
  }

  /**
   * Obtenir tous les items de la queue
   */
  getQueueItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Forcer la synchronisation maintenant
   */
  async forceSyncNow(): Promise<void> {
    if (NetworkMonitor.isOffline()) {
      throw new Error('Impossible de synchroniser : hors ligne');
    }
    
    await this.startSync();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    NetworkMonitor.removeListener('offline-queue');
    this.listeners.clear();
    this.syncHandlers.clear();
    this.isInitialized = false;
    console.log('📦 OfflineQueue arrêté');
  }
}

// Instance singleton
export const OfflineQueue = new OfflineQueueService();
