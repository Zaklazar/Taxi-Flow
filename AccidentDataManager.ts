import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const ACCIDENT_DATA_KEY = '@accident_current_data';

export interface AccidentPhoto {
  id: string;
  type: 'vue-large' | 'avant' | 'arriere' | 'zoom';
  uri: string;
  timestamp: string;
}

export interface AccidentData {
  id: string;
  createdAt: string;
  photos: AccidentPhoto[];
  croquisUri: string | null;
  conducteurB: {
    permis: any;
    assurance: any;
  } | null;
}

export class AccidentDataManager {
  // Obtenir les données de l'accident en cours
  static async getCurrentAccident(): Promise<AccidentData | null> {
    try {
      const data = await AsyncStorage.getItem(ACCIDENT_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Erreur chargement accident:', error);
      return null;
    }
  }

  // Créer un nouvel accident
  static async createNewAccident(): Promise<AccidentData> {
    const newAccident: AccidentData = {
      id: `accident_${Date.now()}`,
      createdAt: new Date().toISOString(),
      photos: [],
      croquisUri: null,
      conducteurB: null
    };
    
    await AsyncStorage.setItem(ACCIDENT_DATA_KEY, JSON.stringify(newAccident));
    return newAccident;
  }

  // Ajouter une photo de dommage
  static async addPhoto(photo: AccidentPhoto): Promise<void> {
    try {
      let accident = await this.getCurrentAccident();
      if (!accident) {
        accident = await this.createNewAccident();
      }

      // Copier l'image vers un dossier permanent
      const permanentDir = `${FileSystem.documentDirectory}accident_photos/`;
      await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      
      const filename = `${photo.type}_${Date.now()}.jpg`;
      const permanentUri = permanentDir + filename;
      
      await FileSystem.copyAsync({
        from: photo.uri,
        to: permanentUri
      });

      photo.uri = permanentUri;
      
      // Supprimer l'ancienne photo du même type si elle existe
      accident.photos = accident.photos.filter(p => p.type !== photo.type);
      accident.photos.push(photo);
      
      await AsyncStorage.setItem(ACCIDENT_DATA_KEY, JSON.stringify(accident));
      console.log('✅ Photo de dommage sauvegardée:', photo.type);
    } catch (error) {
      console.error('❌ Erreur sauvegarde photo:', error);
      throw error;
    }
  }

  // Obtenir toutes les photos
  static async getPhotos(): Promise<AccidentPhoto[]> {
    const accident = await this.getCurrentAccident();
    return accident?.photos || [];
  }

  // Sauvegarder le croquis
  static async saveCroquis(uri: string): Promise<void> {
    try {
      let accident = await this.getCurrentAccident();
      if (!accident) {
        accident = await this.createNewAccident();
      }

      // Copier vers un dossier permanent
      const permanentDir = `${FileSystem.documentDirectory}accident_photos/`;
      await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      
      const permanentUri = `${permanentDir}croquis_${Date.now()}.png`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri
      });

      accident.croquisUri = permanentUri;
      
      await AsyncStorage.setItem(ACCIDENT_DATA_KEY, JSON.stringify(accident));
      console.log('✅ Croquis sauvegardé:', permanentUri);
    } catch (error) {
      console.error('❌ Erreur sauvegarde croquis:', error);
      throw error;
    }
  }

  // Obtenir le croquis
  static async getCroquis(): Promise<string | null> {
    const accident = await this.getCurrentAccident();
    return accident?.croquisUri || null;
  }

  // Supprimer uniquement les photos
  static async clearPhotos(): Promise<void> {
    try {
      const accident = await this.getCurrentAccident();
      if (!accident) return;

      // Supprimer les fichiers photos physiquement
      for (const photo of accident.photos) {
        try {
          const exists = await FileSystem.getInfoAsync(photo.uri);
          if (exists.exists) {
            await FileSystem.deleteAsync(photo.uri, { idempotent: true });
          }
        } catch (err) {
          console.warn('⚠️ Impossible de supprimer photo:', photo.uri);
        }
      }

      // Vider le tableau de photos
      accident.photos = [];
      await AsyncStorage.setItem(ACCIDENT_DATA_KEY, JSON.stringify(accident));
      console.log('✅ Photos supprimées');
    } catch (error) {
      console.error('❌ Erreur suppression photos:', error);
      throw error;
    }
  }

  // Supprimer uniquement le croquis
  static async clearCroquis(): Promise<void> {
    try {
      const accident = await this.getCurrentAccident();
      if (!accident || !accident.croquisUri) return;

      // Supprimer le fichier croquis physiquement
      try {
        const exists = await FileSystem.getInfoAsync(accident.croquisUri);
        if (exists.exists) {
          await FileSystem.deleteAsync(accident.croquisUri, { idempotent: true });
        }
      } catch (err) {
        console.warn('⚠️ Impossible de supprimer croquis:', accident.croquisUri);
      }

      // Retirer l'URI
      accident.croquisUri = null;
      await AsyncStorage.setItem(ACCIDENT_DATA_KEY, JSON.stringify(accident));
      console.log('✅ Croquis supprimé');
    } catch (error) {
      console.error('❌ Erreur suppression croquis:', error);
      throw error;
    }
  }

  // Supprimer l'accident en cours (après génération du PDF)
  static async clearCurrentAccident(): Promise<void> {
    try {
      const accident = await this.getCurrentAccident();
      if (accident) {
        // Supprimer les fichiers
        const dir = `${FileSystem.documentDirectory}accident_photos/`;
        const exists = await FileSystem.getInfoAsync(dir);
        if (exists.exists) {
          await FileSystem.deleteAsync(dir, { idempotent: true });
        }
      }
      
      await AsyncStorage.removeItem(ACCIDENT_DATA_KEY);
      console.log('✅ Données d\'accident nettoyées');
    } catch (error) {
      console.error('❌ Erreur nettoyage accident:', error);
    }
  }

  // Compter les photos par type
  static async getPhotoStats(): Promise<{ total: number; types: string[] }> {
    const photos = await this.getPhotos();
    return {
      total: photos.length,
      types: photos.map(p => p.type)
    };
  }
}
