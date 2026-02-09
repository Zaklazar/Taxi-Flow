import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

export interface Depense {
  id: string;
  date: Date;
  category: string;
  amountHT: number;
  tps: number;
  tvq: number;
  totalTTC: number;
  description: string;
  imageUrl: string;
  mois: string; // Format: "2026-01"
}

export interface Revenue {
  id: string;
  date: Date;
  montant: number;
  description: string;
  mois: string; // Format: "2026-01"
}

const STORAGE_KEYS = {
  DEPENSES: '@taxi_depenses',
  RECETTES: '@taxi_recettes',
};

export function useDepenses() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [depensesJson, recettesJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DEPENSES),
        AsyncStorage.getItem(STORAGE_KEYS.RECETTES),
      ]);

      if (depensesJson) {
        const parsed = JSON.parse(depensesJson);
        setDepenses(parsed.map((d: any) => ({
          ...d,
          date: new Date(d.date),
        })));
      }

      if (recettesJson) {
        const parsed = JSON.parse(recettesJson);
        setRevenues(parsed.map((r: any) => ({
          ...r,
          date: new Date(r.date),
        })));
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDepenses = async (newDepenses: Depense[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEPENSES, JSON.stringify(newDepenses));
      setDepenses(newDepenses);
    } catch (error) {
      console.error('Erreur sauvegarde dépenses:', error);
      throw error;
    }
  };

  const saveRevenues = async (newRevenues: Revenue[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECETTES, JSON.stringify(newRevenues));
      setRevenues(newRevenues);
    } catch (error) {
      console.error('Erreur sauvegarde revenues:', error);
      throw error;
    }
  };

  const ajouterDepense = useCallback(async (depenseData: Omit<Depense, 'id'>) => {
    const newDepense: Depense = {
      ...depenseData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    const updated = [...depenses, newDepense].sort((a, b) => b.date.getTime() - a.date.getTime());
    await saveDepenses(updated);
  }, [depenses]);

  const ajouterRevenue = useCallback(async (revenueData: Omit<Revenue, 'id'>) => {
    const newRevenue: Revenue = {
      ...revenueData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    const updated = [...revenues, newRevenue].sort((a, b) => b.date.getTime() - a.date.getTime());
    await saveRevenues(updated);
  }, [revenues]);

  const supprimerDepense = useCallback(async (id: string) => {
    const updated = depenses.filter((d) => d.id !== id);
    await saveDepenses(updated);
  }, [depenses]);

  const supprimerRevenue = useCallback(async (id: string) => {
    const updated = revenues.filter((r: Revenue) => r.id !== id);
    await saveRevenues(updated);
  }, [revenues]);

  const getDepensesParMois = useCallback((mois: string): Depense[] => {
    return depenses.filter((d) => d.mois === mois);
  }, [depenses]);

  const getRevenuesParMois = useCallback((mois: string): Revenue[] => {
    return revenues.filter((r: Revenue) => r.mois === mois);
  }, [revenues]);

  const getTotalDepensesMois = useCallback((mois: string): number => {
    const depensesMois = getDepensesParMois(mois);
    return depensesMois.reduce((sum, d) => sum + d.totalTTC, 0);
  }, [getDepensesParMois]);

  const getTotalRevenuesMois = useCallback((mois: string): number => {
    const revenuesMois = getRevenuesParMois(mois);
    return revenuesMois.reduce((sum, r) => sum + r.montant, 0);
  }, [getRevenuesParMois]);

  const getNetMois = useCallback((mois: string): number => {
    return getTotalRevenuesMois(mois) - getTotalDepensesMois(mois);
  }, [getTotalRevenuesMois, getTotalDepensesMois]);

  return {
    depenses,
    revenues,
    loading,
    ajouterDepense,
    ajouterRevenue,
    supprimerDepense,
    supprimerRevenue,
    getDepensesParMois,
    getRevenuesParMois,
    getTotalDepensesMois,
    getTotalRevenuesMois,
    getNetMois,
  };
}

export function getMoisCourant(): string {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = String(now.getMonth() + 1).padStart(2, '0');
  return `${annee}-${mois}`;
}

export function formaterMois(mois: string): string {
  const [annee, numMois] = mois.split('-');
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${moisNoms[parseInt(numMois) - 1]} ${annee}`;
}
