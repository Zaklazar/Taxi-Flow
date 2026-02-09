/**
 * IncomeService.ts
 * 
 * Service de gestion des revenus (courses de taxi) dans Firestore.
 * Architecture bilingue : Firestore stocke les IDs (ex: "COURSE"), i18next gère les traductions.
 * 
 * Fonctionnalités :
 * - Ajout de revenus (courses, pourboires, autres)
 * - Récupération avec filtres avancés (date, catégorie, statut)
 * - Mise à jour et suppression
 * - Calculs de totaux par période
 * - Groupement par catégorie
 * - Validation des données avant insertion
 * 
 * @example
 * // Ajouter une course
 * const incomeId = await addIncome({
 *   categoryId: 'COURSE',
 *   origin: '123 Rue Principale, Montréal',
 *   destination: '456 Avenue Centrale, Montréal',
 *   distance: 12.5,
 *   duration: 25,
 *   amount: 35.00,
 *   date: Timestamp.now(),
 *   paymentMethod: 'card',
 *   source: 'manual'
 * }, 'chauffeur-123');
 * 
 * // Récupérer les revenus du mois
 * const startDate = Timestamp.fromDate(new Date('2025-01-01'));
 * const endDate = Timestamp.fromDate(new Date('2025-01-31'));
 * const incomes = await getIncomes('chauffeur-123', { startDate, endDate });
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  IncomeCategoryId,
  PAYMENT_METHODS,
  PaymentMethod,
  SortOptions,
  TransactionStatus
} from '../constants/Accounting';
import {
  CreateIncomeInput,
  Income,
  PaginationOptions,
  TransactionFilters
} from '../types/Accounting';
import { COLLECTIONS, db } from './firebaseConfig';

/**
 * Validation des données de revenu avant insertion
 */
export const validateIncomeData = (data: CreateIncomeInput): string[] => {
  const errors: string[] = [];

  // Validation categoryId
  const validCategories: IncomeCategoryId[] = ['COURSE', 'MEDICAL', 'AIRPORT', 'POURBOIRE', 'OTHER'];
  if (!validCategories.includes(data.categoryId)) {
    errors.push(`Invalid categoryId: ${data.categoryId}`);
  }

  // Validation amount
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  // Validation date
  if (!data.date || !(data.date instanceof Timestamp)) {
    errors.push('Date must be a valid Firestore Timestamp');
  }

  // Validation paymentMethod (uniquement requis si source != 'manual')
  if (data.source !== 'manual') {
    const validPaymentMethods: PaymentMethod[] = Object.values(PAYMENT_METHODS);
    const paymentMethod = data.paymentMethod || data.tripDetails?.paymentMethod;
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      errors.push(`Invalid paymentMethod: ${paymentMethod}`);
    }
  }

  // Validation source
  if (!['manual', 'scanner', 'import'].includes(data.source)) {
    errors.push(`Invalid source: ${data.source}`);
  }

  // Validation spécifique pour les courses (seulement si source n'est pas 'manual')
  // Pour les revenus manuels, origin/destination sont optionnels
  if (['COURSE', 'MEDICAL', 'AIRPORT'].includes(data.categoryId) && data.source !== 'manual') {
    if (!data.origin || data.origin.trim() === '') {
      errors.push('Origin is required for trip categories');
    }
    if (!data.destination || data.destination.trim() === '') {
      errors.push('Destination is required for trip categories');
    }
  }
  
  // Validation distance/duration (toujours optionnels)
  if (data.distance !== undefined && (typeof data.distance !== 'number' || data.distance < 0)) {
    errors.push('Distance must be a non-negative number');
  }
  if (data.duration !== undefined && (typeof data.duration !== 'number' || data.duration < 0)) {
    errors.push('Duration must be a non-negative number');
  }

  return errors;
};

/**
 * Ajoute un nouveau revenu dans Firestore
 * 
 * @param incomeData - Données du revenu (sans ID ni metadata)
 * @param driverId - ID du chauffeur propriétaire
 * @returns ID du document créé
 * @throws Error si validation échoue ou insertion échoue
 */
export const addIncome = async (
  incomeData: CreateIncomeInput,
  driverId: string
): Promise<string> => {
  // Validation
  const errors = validateIncomeData(incomeData);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Construction du document avec metadata
  const now = Timestamp.now();
  const incomeDoc: Omit<Income, 'id'> = {
    ...incomeData,
    status: 'completed' as TransactionStatus,
    driverId,
    createdAt: now,
    updatedAt: now,
    createdBy: driverId,
    updatedBy: driverId
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.INCOME), incomeDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error adding income:', error);
    throw new Error('Failed to add income to Firestore');
  }
};

/**
 * Récupère les revenus avec filtres, tri et pagination
 * 
 * @param driverId - ID du chauffeur
 * @param filters - Filtres optionnels (date, catégorie, statut, etc.)
 * @param sortOptions - Options de tri (field, direction)
 * @param paginationOptions - Options de pagination (limit, offset)
 * @returns Array de revenus
 */
export const getIncomes = async (
  driverId: string,
  filters?: TransactionFilters,
  sortOptions?: SortOptions,
  paginationOptions?: PaginationOptions
): Promise<Income[]> => {
  try {
    let q = query(
      collection(db, COLLECTIONS.INCOME),
      where('driverId', '==', driverId)
    );

    // Filtres
    if (filters?.startDate) {
      q = query(q, where('date', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      q = query(q, where('date', '<=', filters.endDate));
    }
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.paymentMethod) {
      q = query(q, where('paymentMethod', '==', filters.paymentMethod));
    }

    // Tri
    const sortField = sortOptions?.field || 'date';
    const sortDirection = sortOptions?.direction || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    // Pagination
    if (paginationOptions?.limit) {
      q = query(q, limit(paginationOptions.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Income));
  } catch (error) {
    console.error('Error getting incomes:', error);
    throw new Error('Failed to fetch incomes from Firestore');
  }
};

/**
 * Récupère un revenu spécifique par son ID
 * 
 * @param incomeId - ID du revenu
 * @returns Revenu ou null si non trouvé
 */
export const getIncomeById = async (incomeId: string): Promise<Income | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.INCOME, incomeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Income;
    }
    return null;
  } catch (error) {
    console.error('Error getting income by ID:', error);
    throw new Error('Failed to fetch income from Firestore');
  }
};

/**
 * Met à jour un revenu existant
 * 
 * @param incomeId - ID du revenu à mettre à jour
 * @param updates - Champs à mettre à jour (partiel)
 * @param updatedBy - ID de l'utilisateur effectuant la mise à jour
 * @throws Error si mise à jour échoue
 */
export const updateIncome = async (
  incomeId: string,
  updates: Partial<CreateIncomeInput>,
  updatedBy: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.INCOME, incomeId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  } catch (error) {
    console.error('Error updating income:', error);
    throw new Error('Failed to update income in Firestore');
  }
};

/**
 * Supprime un revenu
 * 
 * @param incomeId - ID du revenu à supprimer
 * @throws Error si suppression échoue
 */
export const deleteIncome = async (incomeId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.INCOME, incomeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting income:', error);
    throw new Error('Failed to delete income from Firestore');
  }
};

/**
 * Calcule le total des revenus pour une période donnée
 * 
 * @param driverId - ID du chauffeur
 * @param startDate - Date de début (optionnel)
 * @param endDate - Date de fin (optionnel)
 * @returns Total des revenus
 */
export const getTotalIncome = async (
  driverId: string,
  startDate?: Timestamp,
  endDate?: Timestamp
): Promise<number> => {
  const incomes = await getIncomes(
    driverId,
    { startDate, endDate, status: 'completed' }
  );

  return incomes.reduce((total, income) => total + income.amount, 0);
};

/**
 * Groupe les revenus par catégorie pour une période donnée
 * 
 * @param driverId - ID du chauffeur
 * @param startDate - Date de début (optionnel)
 * @param endDate - Date de fin (optionnel)
 * @returns Map de categoryId -> total
 */
export const getIncomesByCategory = async (
  driverId: string,
  startDate?: Timestamp,
  endDate?: Timestamp
): Promise<Record<IncomeCategoryId, number>> => {
  const incomes = await getIncomes(
    driverId,
    { startDate, endDate, status: 'completed' }
  );

  const categoryTotals: Record<string, number> = {};

  incomes.forEach(income => {
    if (!categoryTotals[income.categoryId]) {
      categoryTotals[income.categoryId] = 0;
    }
    categoryTotals[income.categoryId] += income.amount;
  });

  return categoryTotals as Record<IncomeCategoryId, number>;
};

/**
 * Récupère les statistiques de courses pour une période donnée
 * 
 * @param driverId - ID du chauffeur
 * @param startDate - Date de début (optionnel)
 * @param endDate - Date de fin (optionnel)
 * @returns Statistiques (total revenus, nombre de courses, distance totale, etc.)
 */
export const getTripStats = async (
  driverId: string,
  startDate?: Timestamp,
  endDate?: Timestamp
): Promise<{
  totalRevenue: number;
  tripCount: number;
  totalDistance: number;
  totalDuration: number;
  averageRevenue: number;
  averageDistance: number;
  averageDuration: number;
}> => {
  const incomes = await getIncomes(
    driverId,
    { startDate, endDate, status: 'completed' }
  );

  // Filtrer uniquement les courses (pas les pourboires ou autres)
  const trips = incomes.filter(income =>
    ['COURSE', 'MEDICAL', 'AIRPORT'].includes(income.categoryId)
  );

  const totalRevenue = trips.reduce((sum, trip) => sum + trip.amount, 0);
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalDuration = trips.reduce((sum, trip) => sum + (trip.duration || 0), 0);
  const tripCount = trips.length;

  return {
    totalRevenue,
    tripCount,
    totalDistance,
    totalDuration,
    averageRevenue: tripCount > 0 ? totalRevenue / tripCount : 0,
    averageDistance: tripCount > 0 ? totalDistance / tripCount : 0,
    averageDuration: tripCount > 0 ? totalDuration / tripCount : 0
  };
};

/**
 * Récupère les revenus par méthode de paiement pour une période donnée
 * 
 * @param driverId - ID du chauffeur
 * @param startDate - Date de début (optionnel)
 * @param endDate - Date de fin (optionnel)
 * @returns Map de paymentMethod -> total
 */
export const getIncomesByPaymentMethod = async (
  driverId: string,
  startDate?: Timestamp,
  endDate?: Timestamp
): Promise<Record<PaymentMethod, number>> => {
  const incomes = await getIncomes(
    driverId,
    { startDate, endDate, status: 'completed' }
  );

  const paymentTotals: Record<string, number> = {
    cash: 0,
    card: 0,
    debit: 0,
    mobile: 0,
    other: 0
  };

  incomes.forEach(income => {
    paymentTotals[income.paymentMethod] += income.amount;
  });

  return paymentTotals as Record<PaymentMethod, number>;
};
