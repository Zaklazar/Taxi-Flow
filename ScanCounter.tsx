import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SubscriptionService } from '../src/services/SubscriptionService';
import { useRouter } from 'expo-router';

const Colors = {
  background: '#18181B',
  card: '#27272A',
  darkCard: '#1F1F23',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  border: '#3F3F46'
};

interface ScanCounterProps {
  onPress?: () => void;
}

export const ScanCounter: React.FC<ScanCounterProps> = ({ onPress }) => {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await SubscriptionService.getSubscriptionSummary();
      setSummary(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement compteur scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/paywall');
    }
  };

  if (loading || !summary) {
    return null;
  }

  // Déterminer la couleur selon le statut
  let color = Colors.success;
  let icon = 'check-circle';
  
  if (summary.percentUsed >= 90) {
    color = Colors.danger;
    icon = 'alert-circle';
  } else if (summary.percentUsed >= 70) {
    color = Colors.warning;
    icon = 'alert';
  }

  // Message selon le statut
  let statusText = '';
  if (summary.status === 'trial') {
    statusText = `Essai ${summary.daysLeft}j restant${summary.daysLeft > 1 ? 's' : ''}`;
  } else if (summary.status === 'premium') {
    statusText = summary.isFallbackMode ? 'Mode dépannage' : 'Premium';
  } else if (summary.status === 'expired') {
    statusText = 'Période expirée';
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{statusText}</Text>
          <Text style={[styles.countText, { color }]}>
            {summary.scansRemaining}/{summary.totalQuota} scans
          </Text>
        </View>
        
        {summary.status !== 'premium' && (
          <MaterialCommunityIcons name="crown" size={16} color={Colors.gold} />
        )}
      </View>
      
      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${Math.min(100, summary.percentUsed)}%`,
              backgroundColor: color
            }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  textContainer: {
    flex: 1
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSub,
    marginBottom: 2
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.darkCard,
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  }
});
