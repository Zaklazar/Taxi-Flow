/**
 * COMPOSANT : INDICATEUR D'ÉTAT RÉSEAU
 * 
 * Affiche un badge visuel indiquant si l'application est en ligne ou hors ligne.
 * 
 * États :
 * - En ligne : badge vert avec icône wifi
 * - Hors ligne : badge orange avec icône cloud-off
 * - Items en attente : compte affiché
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NetworkMonitor, NetworkStatus } from '../services/NetworkMonitor';
import { OfflineQueue, QueueStats } from '../services/OfflineQueue';

interface NetworkIndicatorProps {
  position?: 'top' | 'bottom';
  showDetails?: boolean;
  onPress?: () => void;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  position = 'top',
  showDetails = false,
  onPress
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('unknown');
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalItems: 0,
    pendingItems: 0,
    failedItems: 0,
    syncedItems: 0
  });
  
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // S'abonner aux changements de réseau
    NetworkMonitor.addListener('network-indicator', (status) => {
      setNetworkStatus(status);
      
      // Animation d'apparition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: status === 'offline' ? 1 : 0, // Rester visible si offline
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    });

    // S'abonner aux changements de queue
    OfflineQueue.addListener('network-indicator', (stats) => {
      setQueueStats(stats);
    });

    return () => {
      NetworkMonitor.removeListener('network-indicator');
      OfflineQueue.removeListener('network-indicator');
    };
  }, []);

  // Ne rien afficher si statut inconnu
  if (networkStatus === 'unknown') {
    return null;
  }

  const isOnline = networkStatus === 'online';
  const hasPendingItems = queueStats.pendingItems > 0;

  const getIconName = () => {
    if (isOnline) {
      return hasPendingItems ? 'cloud-sync' : 'wifi';
    }
    return 'cloud-off-outline';
  };

  const getBackgroundColor = () => {
    if (isOnline) {
      return hasPendingItems ? '#F59E0B' : '#22C55E'; // Orange si sync en cours, vert sinon
    }
    return '#EF4444'; // Rouge si offline
  };

  const getMessage = () => {
    if (isOnline) {
      if (hasPendingItems) {
        return `Synchronisation... (${queueStats.pendingItems})`;
      }
      return 'En ligne';
    }
    
    if (queueStats.totalItems > 0) {
      return `Hors ligne · ${queueStats.totalItems} en attente`;
    }
    
    return 'Hors ligne';
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (isOnline && hasPendingItems) {
      // Forcer la synchronisation
      OfflineQueue.forceSyncNow().catch(error => {
        console.error('Erreur synchronisation forcée:', error);
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'bottom' ? styles.containerBottom : styles.containerTop,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: getBackgroundColor() }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name={getIconName()}
          size={16}
          color="#FFFFFF"
        />
        <Text style={styles.text}>{getMessage()}</Text>
        
        {showDetails && queueStats.failedItems > 0 && (
          <View style={styles.errorBadge}>
            <MaterialCommunityIcons name="alert-circle" size={12} color="#FFF" />
            <Text style={styles.errorText}>{queueStats.failedItems}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none'
  },
  containerTop: {
    top: 50
  },
  containerBottom: {
    bottom: 20
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  }
});
