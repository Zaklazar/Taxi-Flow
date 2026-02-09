/**
 * SERVICE RONDE DE SÉCURITÉ - VERSION OFFLINE FIRST
 * 
 * Adaptation du SafetyRoundService pour supporter le mode hors-ligne.
 * Les rondes sont enregistrées localement puis synchronisées automatiquement.
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../src/services/firebaseConfig';
import { CreateSafetyRoundInput, SafetyRound } from '../types/safetyRound';
import { OfflineQueue } from './OfflineQueue';
import { NetworkMonitor } from './NetworkMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SafetyRoundOfflineService {
  private static readonly LOCAL_ROUNDS_KEY = '@safety_rounds_local';

  /**
   * Initialiser le service
   */
  static async initialize(): Promise<void> {
    console.log('🔧 Initialisation SafetyRoundOfflineService');

    // Enregistrer le handler de synchronisation
    OfflineQueue.registerSyncHandler('safety_round', async (item) => {
      await this.syncRoundToFirebase(item.data);
    });

    console.log('✅ SafetyRoundOfflineService initialisé');
  }

  /**
   * Créer une ronde de sécurité (offline-first)
   */
  static async createSafetyRound(data: CreateSafetyRoundInput): Promise<string> {
    console.log('📝 Création ronde de sécurité (offline-first)');

    // Sauvegarder localement d'abord (toujours)
    const localId = await this.saveRoundLocally(data);

    // Si en ligne, enregistrer immédiatement ET ajouter à la queue pour backup
    if (NetworkMonitor.isOnline()) {
      try {
        const firestoreId = await this.saveRoundToFirebase(data);
        console.log(`✅ Ronde sauvegardée: Firebase=${firestoreId}, Local=${localId}`);
        
        // Marquer comme synchronisée localement
        await this.markRoundAsSynced(localId, firestoreId);
        
        return firestoreId;
      } catch (error) {
        console.error('❌ Échec sauvegarde Firebase, ajout à la queue:', error);
        
        // Ajouter à la queue pour synchronisation ultérieure
        await OfflineQueue.enqueue('safety_round', {
          ...data,
          localId
        });
        
        return localId; // Retourner l'ID local
      }
    } else {
      // Hors ligne : ajouter à la queue de synchronisation
      console.log('📵 Hors ligne, ajout à la queue de synchronisation');
      
      await OfflineQueue.enqueue('safety_round', {
        ...data,
        localId
      });
      
      return localId;
    }
  }

  /**
   * Sauvegarder une ronde localement dans AsyncStorage
   */
  private static async saveRoundLocally(data: CreateSafetyRoundInput): Promise<string> {
    try {
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const localRound = {
        id: localId,
        ...data,
        createdAt: Date.now(),
        synced: false,
        firestoreId: null
      };

      // Charger les rondes existantes
      const existingRounds = await this.getLocalRounds();
      
      // Ajouter la nouvelle
      existingRounds.push(localRound);
      
      // Sauvegarder
      await AsyncStorage.setItem(
        SafetyRoundOfflineService.LOCAL_ROUNDS_KEY,
        JSON.stringify(existingRounds)
      );

      console.log(`💾 Ronde sauvegardée localement: ${localId}`);
      return localId;
    } catch (error) {
      console.error('❌ Erreur sauvegarde locale:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder une ronde dans Firebase
   */
  private static async saveRoundToFirebase(data: CreateSafetyRoundInput): Promise<string> {
    const roundData = {
      ...data,
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.SAFETY_ROUNDS), roundData);
    console.log(`☁️ Ronde sauvegardée dans Firebase: ${docRef.id}`);
    
    return docRef.id;
  }

  /**
   * Synchroniser une ronde vers Firebase (appelé par OfflineQueue)
   */
  private static async syncRoundToFirebase(data: any): Promise<void> {
    const { localId, ...roundData } = data;

    try {
      const firestoreId = await this.saveRoundToFirebase(roundData);
      
      // Marquer comme synchronisée
      await this.markRoundAsSynced(localId, firestoreId);
      
      console.log(`✅ Ronde synchronisée: ${localId} → ${firestoreId}`);
    } catch (error) {
      console.error(`❌ Erreur synchronisation ronde ${localId}:`, error);
      throw error;
    }
  }

  /**
   * Marquer une ronde locale comme synchronisée
   */
  private static async markRoundAsSynced(localId: string, firestoreId: string): Promise<void> {
    try {
      const rounds = await this.getLocalRounds();
      const roundIndex = rounds.findIndex(r => r.id === localId);
      
      if (roundIndex !== -1) {
        rounds[roundIndex].synced = true;
        rounds[roundIndex].firestoreId = firestoreId;
        
        await AsyncStorage.setItem(
          SafetyRoundOfflineService.LOCAL_ROUNDS_KEY,
          JSON.stringify(rounds)
        );
        
        console.log(`✅ Ronde marquée comme synchronisée: ${localId}`);
      }
    } catch (error) {
      console.error('❌ Erreur marquage synchronisation:', error);
    }
  }

  /**
   * Obtenir toutes les rondes locales
   */
  private static async getLocalRounds(): Promise<any[]> {
    try {
      const json = await AsyncStorage.getItem(SafetyRoundOfflineService.LOCAL_ROUNDS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('❌ Erreur lecture rondes locales:', error);
      return [];
    }
  }

  /**
   * Obtenir l'historique des rondes (local + Firebase)
   */
  static async getSafetyRounds(driverId: string, limitCount: number = 50): Promise<SafetyRound[]> {
    const allRounds: SafetyRound[] = [];

    // 1. Charger les rondes locales non synchronisées
    const localRounds = await this.getLocalRounds();
    const unsyncedRounds = localRounds
      .filter(r => !r.synced && r.chauffeurId === driverId)
      .map(r => ({
        id: r.id,
        ...r,
        source: 'local' as const
      }));

    allRounds.push(...unsyncedRounds);

    // 2. Charger depuis Firebase si en ligne
    if (NetworkMonitor.isOnline()) {
      try {
        const q = query(
          collection(db, COLLECTIONS.SAFETY_ROUNDS),
          where('chauffeurId', '==', driverId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const firebaseRounds = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            source: 'firebase' as const
          };
        }) as SafetyRound[];

        allRounds.push(...firebaseRounds);
        console.log(`☁️ ${firebaseRounds.length} rondes chargées depuis Firebase`);
      } catch (error) {
        console.error('❌ Erreur chargement Firebase:', error);
      }
    }

    // 3. Trier par date (plus récent en premier)
    allRounds.sort((a, b) => {
      const timeA = (a.createdAt as any) instanceof Timestamp 
        ? (a.createdAt as Timestamp).toMillis() 
        : (typeof a.createdAt === 'number' ? a.createdAt : Date.now());
      const timeB = (b.createdAt as any) instanceof Timestamp 
        ? (b.createdAt as Timestamp).toMillis() 
        : (typeof b.createdAt === 'number' ? b.createdAt : Date.now());
      return timeB - timeA;
    });

    console.log(`📋 ${allRounds.length} rondes chargées (${unsyncedRounds.length} locales, ${allRounds.length - unsyncedRounds.length} Firebase)`);
    
    return allRounds;
  }

  /**
   * Déclarer une réparation (offline-first)
   */
  static async declareRepair(
    roundId: string,
    defectKey: string,
    repairData: {
      repairDate: string;
      repairShop: string;
      cost?: number;
      invoice?: string;
      notes?: string;
    }
  ): Promise<void> {
    console.log(`🔧 Déclaration réparation pour ${roundId} - ${defectKey}`);

    // Trouver la ronde (locale ou Firebase)
    const localRounds = await this.getLocalRounds();
    const localRound = localRounds.find(r => r.id === roundId);

    if (localRound) {
      // Ronde locale
      if (!localRound.repairs) {
        localRound.repairs = {};
      }
      
      localRound.repairs[defectKey] = repairData;
      
      await AsyncStorage.setItem(
        SafetyRoundOfflineService.LOCAL_ROUNDS_KEY,
        JSON.stringify(localRounds)
      );
      
      console.log('💾 Réparation enregistrée localement');
    }

    // Si en ligne et ronde Firebase, mettre à jour directement
    if (NetworkMonitor.isOnline() && !roundId.startsWith('local_')) {
      try {
        const roundRef = doc(db, COLLECTIONS.SAFETY_ROUNDS, roundId);
        await updateDoc(roundRef, {
          [`repairs.${defectKey}`]: repairData,
          lastModified: Timestamp.now()
        });
        
        console.log('☁️ Réparation mise à jour dans Firebase');
      } catch (error) {
        console.error('❌ Erreur mise à jour Firebase:', error);
        // Ajouter à la queue ?
      }
    } else if (!localRound) {
      // Ajouter à la queue pour synchronisation
      await OfflineQueue.enqueue('safety_round', {
        action: 'update_repair',
        roundId,
        defectKey,
        repairData
      });
    }
  }

  /**
   * Nettoyer les rondes locales synchronisées (optionnel, pour économiser l'espace)
   */
  static async cleanupSyncedRounds(olderThanDays: number = 30): Promise<void> {
    try {
      const rounds = await this.getLocalRounds();
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      const filtered = rounds.filter(r => {
        // Garder les non-synchronisées
        if (!r.synced) return true;
        
        // Garder les récentes
        if (r.createdAt > cutoffTime) return true;
        
        return false;
      });

      await AsyncStorage.setItem(
        SafetyRoundOfflineService.LOCAL_ROUNDS_KEY,
        JSON.stringify(filtered)
      );

      const removed = rounds.length - filtered.length;
      console.log(`🗑️ ${removed} rondes anciennes supprimées`);
    } catch (error) {
      console.error('❌ Erreur nettoyage rondes:', error);
    }
  }

  /**
   * Obtenir le statut de synchronisation
   */
  static async getSyncStatus(): Promise<{
    totalLocal: number;
    synced: number;
    pending: number;
  }> {
    const rounds = await this.getLocalRounds();
    const synced = rounds.filter(r => r.synced).length;
    
    return {
      totalLocal: rounds.length,
      synced,
      pending: rounds.length - synced
    };
  }
}

export { SafetyRoundOfflineService };
