// --- SERVICE FIREBASE POUR LES RÉPARATIONS ---

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../src/services/firebaseConfig';
import { Repair, CreateRepairInput } from '../types/repair';
import { SafetyRoundService } from './SafetyRoundService';

const COLLECTION_NAME = 'repairs';

export class RepairService {
  /**
   * Créer une nouvelle déclaration de réparation
   */
  static async create(input: CreateRepairInput): Promise<Repair> {
    try {
      const now = new Date();
      const repairData: any = {
        roundId: input.roundId,
        driverId: input.driverId,
        checkName: input.checkName,
        repairDate: input.repairDate,
        description: input.description,
        isRental: input.isRental,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      // Ajouter champs optionnels seulement s'ils existent
      if (input.garageName) repairData.garageName = input.garageName;
      if (input.invoicePhotoUrl) repairData.invoicePhotoUrl = input.invoicePhotoUrl;

      const docRef = await addDoc(collection(db, COLLECTION_NAME), repairData);

      // Lier la réparation au défaut dans la ronde
      await SafetyRoundService.linkRepair(
        input.roundId, 
        input.checkName, 
        docRef.id
      );

      return {
        id: docRef.id,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Erreur création réparation:', error);
      throw new Error('Impossible de créer la déclaration de réparation');
    }
  }

  /**
   * Uploader une photo de facture dans Firebase Storage
   */
  static async uploadInvoicePhoto(
    driverId: string, 
    roundId: string, 
    photoUri: string
  ): Promise<string> {
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();

      const fileName = `invoice_${roundId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `repairs/${driverId}/${fileName}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Erreur upload photo facture:', error);
      throw new Error('Impossible d\'uploader la photo de facture');
    }
  }

  /**
   * Récupérer toutes les réparations d'un chauffeur
   */
  static async getByDriver(driverId: string): Promise<Repair[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('driverId', '==', driverId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as Repair));
    } catch (error) {
      console.error('Erreur récupération réparations:', error);
      throw new Error('Impossible de récupérer les réparations');
    }
  }

  /**
   * Récupérer les réparations d'une ronde spécifique
   */
  static async getByRound(roundId: string): Promise<Repair[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('roundId', '==', roundId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as Repair));
    } catch (error) {
      console.error('Erreur récupération réparations de la ronde:', error);
      throw new Error('Impossible de récupérer les réparations');
    }
  }
}
