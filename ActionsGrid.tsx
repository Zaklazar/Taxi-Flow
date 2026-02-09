import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionsGridProps {
  onAddRevenue: () => void;
  onAddExpense: () => void;
}

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textHeader: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  accent: '#F97316',
  success: '#22C55E',
  error: '#EF4444',
  inputBg: '#333',
  border: '#3F3F46',
};

export const ActionsGrid = memo<ActionsGridProps>(({ onAddRevenue, onAddExpense }) => {
  const router = useRouter();

  const handleSearch = useCallback(() => {
    // TODO: Implémenter la recherche
    console.log('Recherche à implémenter');
  }, []);

  const handleExportExcel = useCallback(() => {
    // TODO: Implémenter l'export Excel
    console.log('Export Excel à implémenter');
  }, []);

  const handleScanFacture = useCallback(() => {
    router.push('/scanFacture');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Opérations</Text>
      
      {/* Première rangée : Actions principales */}
      <View style={styles.gridContainer}>
        {/* Scanner Facture */}
        <TouchableOpacity style={styles.actionCard} onPress={handleScanFacture}>
          <View style={[styles.iconBox, {backgroundColor: Colors.textMain}]}>
            <MaterialCommunityIcons name="camera" size={28} color="#000" />
          </View>
          <Text style={styles.actionTitle}>Scanner</Text>
          <Text style={styles.actionSub}>Facture</Text>
        </TouchableOpacity>
          
        {/* Revenu Manuel */}
        <TouchableOpacity style={styles.actionCard} onPress={onAddRevenue}>
          <View style={[styles.iconBox, {backgroundColor: Colors.success}]}>
            <MaterialCommunityIcons name="cash-plus" size={28} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Revenu</Text>
          <Text style={styles.actionSub}>Manuel</Text>
        </TouchableOpacity>

        {/* Dépense Manuel */}
        <TouchableOpacity style={styles.actionCard} onPress={onAddExpense}>
          <View style={[styles.iconBox, {backgroundColor: Colors.error}]}>
            <MaterialCommunityIcons name="cash-minus" size={28} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>Dépense</Text>
          <Text style={styles.actionSub}>Manuel</Text>
        </TouchableOpacity>
      </View>

      {/* Deuxième rangée : Utilitaires */}
      <View style={styles.gridContainer}>
        {/* Rechercher */}
        <TouchableOpacity 
          style={[styles.actionCard, styles.secondaryAction]} 
          onPress={handleSearch}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={Colors.textMain} />
          <Text style={styles.actionTitle}>Rechercher</Text>
        </TouchableOpacity>
        
        {/* Générer Rapport Excel */}
        <TouchableOpacity 
          style={[styles.actionCard, styles.secondaryAction]} 
          onPress={handleExportExcel}
        >
          <MaterialCommunityIcons name="file-excel" size={24} color={Colors.textMain} />
          <Text style={styles.actionTitle}>Rapport Excel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

ActionsGrid.displayName = 'ActionsGrid';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMain,
    textAlign: 'center',
  },
  actionSub: {
    fontSize: 12,
    color: Colors.textSub,
    textAlign: 'center',
    marginTop: 2,
  },
});
