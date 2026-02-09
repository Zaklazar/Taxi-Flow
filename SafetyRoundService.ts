// --- SERVICE FIREBASE POUR LES RONDES DE SÉCURITÉ ---

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../src/services/firebaseConfig';
import { SafetyRound, CreateSafetyRoundInput, DefectDetail } from '../types/safetyRound';

const COLLECTION_NAME = 'safety_rounds';

export class SafetyRoundService {
  /**
   * Créer une nouvelle ronde de sécurité
   */
  static async create(input: CreateSafetyRoundInput): Promise<SafetyRound> {
    try {
      const now = new Date();
      
      // Préparer les données en filtrant les valeurs undefined (Firestore ne les accepte pas)
      const roundData: any = {
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        odometre: input.odometre,
        statut: input.statut,
        checks: input.checks,
        date: new Date().toISOString(),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      // Ajouter uniquement les champs optionnels définis
      if (input.observations) roundData.observations = input.observations;
      if (input.defects && input.defects.length > 0) roundData.defects = input.defects;
      if (input.photos && input.photos.length > 0) roundData.photos = input.photos;
      if (input.localisation_gps) roundData.localisation_gps = input.localisation_gps;
      if (input.obd2_codes_erreur && input.obd2_codes_erreur.length > 0) roundData.obd2_codes_erreur = input.obd2_codes_erreur;
      if (input.obd2_frein_status) roundData.obd2_frein_status = input.obd2_frein_status;
      if (input.obd2_engine_status) roundData.obd2_engine_status = input.obd2_engine_status;

      const docRef = await addDoc(collection(db, COLLECTION_NAME), roundData);
      
      return {
        id: docRef.id,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        odometre: input.odometre,
        statut: input.statut,
        checks: input.checks,
        date: roundData.date,
        observations: input.observations,
        defects: input.defects,
        photos: input.photos,
        localisation_gps: input.localisation_gps,
        obd2_codes_erreur: input.obd2_codes_erreur,
        obd2_frein_status: input.obd2_frein_status,
        obd2_engine_status: input.obd2_engine_status,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Erreur création ronde sécurité:', error);
      throw new Error('Impossible de créer la ronde de sécurité');
    }
  }

  /**
   * Récupérer toutes les rondes d'un chauffeur
   */
  static async getByDriver(driverId: string): Promise<SafetyRound[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('driverId', '==', driverId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => this.mapDocToSafetyRound(doc.id, doc.data()));
    } catch (error) {
      console.error('Erreur récupération rondes:', error);
      throw new Error('Impossible de récupérer les rondes de sécurité');
    }
  }

  /**
   * Récupérer les rondes par période
   */
  static async getByDateRange(
    driverId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<SafetyRound[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('driverId', '==', driverId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => this.mapDocToSafetyRound(doc.id, doc.data()));
    } catch (error) {
      console.error('Erreur récupération rondes par période:', error);
      throw new Error('Impossible de récupérer les rondes pour cette période');
    }
  }

  /**
   * Récupérer une ronde par ID
   */
  static async getById(id: string): Promise<SafetyRound | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.mapDocToSafetyRound(docSnap.id, docSnap.data());
      }
      return null;
    } catch (error) {
      console.error('Erreur récupération ronde:', error);
      throw new Error('Impossible de récupérer la ronde');
    }
  }

  /**
   * Lier une réparation à un défaut
   */
  static async linkRepair(
    roundId: string, 
    checkName: string, 
    repairId: string
  ): Promise<void> {
    try {
      const roundRef = doc(db, COLLECTION_NAME, roundId);
      const roundSnap = await getDoc(roundRef);

      if (!roundSnap.exists()) {
        throw new Error('Ronde introuvable');
      }

      const roundData = roundSnap.data() as SafetyRound;
      const defects = roundData.defects || [];

      // Trouver le défaut correspondant et le marquer comme réparé
      const updatedDefects = defects.map(defect => {
        if (defect.checkName === checkName) {
          return {
            ...defect,
            repaired: true,
            repairId: repairId,
            repairDate: new Date().toISOString(),
          };
        }
        return defect;
      });

      await updateDoc(roundRef, {
        defects: updatedDefects,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Erreur liaison réparation:', error);
      throw new Error('Impossible de lier la réparation');
    }
  }

  /**
   * Ajouter des photos à une ronde
   */
  static async addPhotos(roundId: string, photoUrls: string[]): Promise<void> {
    try {
      const roundRef = doc(db, COLLECTION_NAME, roundId);
      const roundSnap = await getDoc(roundRef);

      if (!roundSnap.exists()) {
        throw new Error('Ronde introuvable');
      }

      const roundData = roundSnap.data() as SafetyRound;
      const existingPhotos = roundData.photos || [];

      await updateDoc(roundRef, {
        photos: [...existingPhotos, ...photoUrls],
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Erreur ajout photos:', error);
      throw new Error('Impossible d\'ajouter les photos');
    }
  }

  /**
   * Récupérer les rondes avec défauts non réparés
   */
  static async getPendingRepairs(driverId: string): Promise<SafetyRound[]> {
    try {
      const rounds = await this.getByDriver(driverId);
      
      return rounds.filter(round => {
        const hasUnrepairedDefects = round.defects?.some(defect => !defect.repaired);
        return hasUnrepairedDefects;
      });
    } catch (error) {
      console.error('Erreur récupération défauts en attente:', error);
      throw new Error('Impossible de récupérer les défauts en attente');
    }
  }

  /**
   * Mapper document Firestore vers SafetyRound
   */
  private static mapDocToSafetyRound(id: string, data: DocumentData): SafetyRound {
    return {
      id,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      date: data.date || (data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
      odometre: data.odometre,
      statut: data.statut,
      checks: data.checks || {},
      observations: data.observations,
      defects: data.defects || [],
      photos: data.photos || [],
      localisation_gps: data.localisation_gps,
      obd2_codes_erreur: data.obd2_codes_erreur,
      obd2_frein_status: data.obd2_frein_status,
      obd2_engine_status: data.obd2_engine_status,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}
