// MIGRATION vers AsyncStorage pour compatibilité Expo Go
// Ce fichier utilise AsyncStorage au lieu de Realm pour fonctionner avec Expo Go
import {
  useDepenses as useDepensesAsync,
  getMoisCourant as getMoisCourantAsync,
  formaterMois as formaterMoisAsync,
  Depense,
  Revenue,
} from './useDepensesAsyncStorage';

// Ré-exporter les types et fonctions
export type { Depense, Revenue };
export const getMoisCourant = getMoisCourantAsync;
export const formaterMois = formaterMoisAsync;

// Wrapper pour maintenir la compatibilité
export function useDepenses() {
  return useDepensesAsync();
}

// Schémas Realm (maintenus pour référence mais non utilisés avec AsyncStorage)
export const DepenseSchema = {
  name: 'Depense',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    id: 'string',
    date: 'date',
    category: 'string',
    amountHT: 'double',
    tps: 'double',
    tvq: 'double',
    totalTTC: 'double',
    description: 'string',
    imageUrl: 'string',
    mois: 'string',
  },
};

export const RevenueSchema = {
  name: 'Revenue',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    id: 'string',
    date: 'date',
    montant: 'double',
    description: 'string',
    mois: 'string',
  },
};
