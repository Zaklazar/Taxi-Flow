import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    PanResponder,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { AccidentDataManager } from '../services/AccidentDataManager';

const Colors = {
  background: '#18181B',
  card: '#FFFFFF',
  darkCard: '#27272A',
  textMain: '#1F2937',
  textHeader: '#FFFFFF',
  textSub: '#6B7280',
  gold: '#FBBF24',
  danger: '#EF4444',
  success: '#22C55E',
};

interface Point {
  x: number;
  y: number;
}

interface PathData {
  points: Point[];
  color: string;
  width: number;
  id: string;
}

export default function CroquisAccidentScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCroquisUri, setSavedCroquisUri] = useState<string | null>(null);
  const canvasRef = useRef<any>(null);

  // Charger le croquis existant au montage
  useEffect(() => {
    loadExistingCroquis();
  }, []);

  const loadExistingCroquis = async () => {
    try {
      const uri = await AccidentDataManager.getCroquis();
      if (uri) {
        setSavedCroquisUri(uri);
      }
    } catch (error) {
      console.error('❌ Erreur chargement croquis:', error);
    }
  };

  // Gestionnaire de dessin simplifié
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath([{ x: locationX, y: locationY }]);
    },
    
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPoint = { x: locationX, y: locationY };
      setCurrentPath(prev => [...prev, newPoint]);
      
      // Si mode gomme, supprimer les tracés qui croisent
      if (isEraser) {
        erasePathsAtPoint(newPoint);
      }
    },
    
    onPanResponderRelease: () => {
      if (currentPath.length > 0 && !isEraser) {
        setPaths(prev => [...prev, {
          points: currentPath,
          color: selectedColor,
          width: strokeWidth,
          id: Date.now().toString()
        }]);
      }
      setCurrentPath([]);
    },
  });

  // Fonction pour effacer les tracés qui croisent la gomme
  const erasePathsAtPoint = (point: Point) => {
    const eraserRadius = strokeWidth * 2;
    
    setPaths(prevPaths => 
      prevPaths.filter(path => {
        // Vérifier si un point du tracé est proche de la gomme
        const isNearEraser = path.points.some(p => {
          const distance = Math.sqrt(
            Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)
          );
          return distance < eraserRadius;
        });
        
        return !isNearEraser; // Garder les tracés qui ne sont PAS proches
      })
    );
  };

  const pointsToPath = (points: Point[]) => {
    if (points.length === 0) return '';
    
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const clearCanvas = () => {
    Alert.alert(
      'Effacer',
      'Effacer tout le croquis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Effacer', onPress: () => setPaths([]) }
      ]
    );
  };

  const undoLast = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  const saveSketch = async () => {
    if (paths.length === 0) {
      Alert.alert('Info', 'Le croquis est vide');
      return;
    }
    
    setSaving(true);
    try {
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
      });
      
      await AccidentDataManager.saveCroquis(uri);
      setSavedCroquisUri(uri);
      
      Alert.alert(
        'Succès', 
        'Croquis sauvegardé de façon permanente !',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erreur sauvegarde croquis:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le croquis');
    } finally {
      setSaving(false);
    }
  };

  const viewSavedSketch = async () => {
    const uri = await AccidentDataManager.getCroquis();
    if (uri) {
      setSavedCroquisUri(uri);
      Alert.alert(t('accident.savedSketchTitle'), t('accident.savedSketchMessage'), [
        { text: t('common.ok') }
      ]);
    } else {
      Alert.alert(t('common.info'), t('accident.noSavedSketch'));
    }
  };

  const resetSketch = () => {
    Alert.alert(
      t('accident.resetSketchTitle'),
      t('accident.resetSketchMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer le croquis sauvegardé
              await AccidentDataManager.clearCroquis();
              // Réinitialiser les tracés
              setPaths([]);
              setSavedCroquisUri(null);
              Alert.alert(t('common.success'), t('accident.sketchReset'));
            } catch (error) {
              console.error('❌ Erreur reset croquis:', error);
              Alert.alert(t('common.error'), t('accident.sketchSaveError'));
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Croquis du constat à l'amiable</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={viewSavedSketch}>
            <MaterialCommunityIcons name="eye" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={saveSketch} disabled={saving}>
            {saving ? (
              <MaterialCommunityIcons name="loading" size={24} color={Colors.gold} />
            ) : (
              <MaterialCommunityIcons name="content-save" size={24} color={Colors.gold} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* INSTRUCTIONS */}
      <View style={styles.instructions}>
        <MaterialCommunityIcons name="information" size={18} color={Colors.gold} />
        <Text style={styles.instructionsText}>
          {t('accident.sketchInstructions')}
        </Text>
      </View>

      {/* CANVAS DE DESSIN */}
      <View style={styles.canvasContainer} ref={canvasRef} collapsable={false}>
        <Svg style={styles.canvas} {...panResponder.panHandlers}>
          {/* Grille de fond */}
          {[...Array(20)].map((_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={i * 20}
                y1={0}
                x2={i * 20}
                y2={600}
                stroke="#E5E5E5"
                strokeWidth={1}
              />
              <Line
                x1={0}
                y1={i * 20}
                x2={400}
                y2={i * 20}
                stroke="#E5E5E5"
                strokeWidth={1}
              />
            </React.Fragment>
          ))}

          {/* Tracés sauvegardés */}
          {paths.map((path, index) => (
            <Path
              key={`path-${index}`}
              d={pointsToPath(path.points)}
              stroke={path.color}
              strokeWidth={path.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Tracé en cours (seulement en mode dessin) */}
          {currentPath.length > 0 && !isEraser && (
            <Path
              d={pointsToPath(currentPath)}
              stroke={selectedColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Indicateur de gomme */}
          {isEraser && currentPath.length > 0 && (
            <Circle
              cx={currentPath[currentPath.length - 1].x}
              cy={currentPath[currentPath.length - 1].y}
              r={strokeWidth * 2}
              fill="rgba(239, 68, 68, 0.3)"
              stroke="#EF4444"
              strokeWidth={2}
            />
          )}
        </Svg>
      </View>

      {/* BARRE D'OUTILS */}
      <View style={styles.toolbar}>
        {/* COULEURS */}
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {[
              { color: '#000000', label: 'Noir' },
              { color: '#EF4444', label: 'Rouge' },
              { color: '#3B82F6', label: 'Bleu' },
              { color: '#22C55E', label: 'Vert' },
            ].map(item => (
              <TouchableOpacity
                key={item.color}
                style={[
                  styles.colorButton,
                  { backgroundColor: item.color },
                  selectedColor === item.color && !isEraser && styles.colorButtonActive
                ]}
                onPress={() => {
                  setSelectedColor(item.color);
                  setIsEraser(false);
                }}
              />
            ))}
            {/* BOUTON GOMME */}
            <TouchableOpacity
              style={[
                styles.eraserButton,
                isEraser && styles.eraserButtonActive
              ]}
              onPress={() => setIsEraser(!isEraser)}
            >
              <MaterialCommunityIcons 
                name="eraser" 
                size={24} 
                color={isEraser ? '#000' : '#FFF'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* TAILLE */}
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>Taille</Text>
          <View style={styles.sizeRow}>
            {[
              { size: 2, label: 'Fin' },
              { size: 5, label: 'Moyen' },
              { size: 10, label: 'Épais' },
            ].map(item => (
              <TouchableOpacity
                key={item.size}
                style={[
                  styles.sizeButton,
                  strokeWidth === item.size && styles.sizeButtonActive
                ]}
                onPress={() => setStrokeWidth(item.size)}
              >
                <Text style={styles.sizeButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={undoLast}>
            <MaterialCommunityIcons name="undo" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={clearCanvas}>
            <MaterialCommunityIcons name="trash-can" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Effacer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.resetButton]} onPress={resetSketch}>
            <MaterialCommunityIcons name="restore" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AFFICHAGE DU CROQUIS SAUVEGARDÉ */}
      {savedCroquisUri && (
        <View style={styles.savedCroquisPreview}>
          <Text style={styles.savedCroquisTitle}>📸 {t('accident.savedSketchTitle')}</Text>
          <Image source={{ uri: savedCroquisUri }} style={styles.savedCroquisImage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.darkCard,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#CCC',
  },
  canvasContainer: {
    flex: 1,
    margin: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  canvas: {
    flex: 1,
  },
  toolbar: {
    backgroundColor: Colors.darkCard,
    padding: 15,
    paddingBottom: Platform.OS === 'android' ? 40 : 15, // Padding supplémentaire pour barre Android
    gap: 15,
  },
  toolSection: {
    gap: 8,
  },
  toolLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: Colors.gold,
    transform: [{ scale: 1.1 }],
  },
  eraserButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraserButtonActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
    transform: [{ scale: 1.1 }],
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  sizeButtonActive: {
    backgroundColor: Colors.gold,
  },
  sizeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  savedCroquisPreview: {
    position: 'absolute',
    bottom: 200,  // Plus haut pour ne pas cacher les boutons
    right: 20,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 10,
    maxWidth: 150,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  savedCroquisTitle: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  savedCroquisImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
});
