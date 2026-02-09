import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/services/firebaseConfig';
import { DocumentData, DocumentType } from '../types/documents';

// Clé de stockage dynamique par utilisateur
const getDocumentsKey = (userId?: string): string => {
  if (!userId) {
    console.warn('⚠️ Aucun userId fourni, utilisation clé générique');
    return 'taxi_professional_documents_guest';
  }
  return `taxi_professional_documents_${userId}`;
};

export const DocumentManager = {
  
  // ========================================
  // CRUD OPERATIONS
  // ========================================

  // Sauvegarder tous les documents (nécessite userId)
  saveDocuments: async (documents: DocumentData[], userId?: string): Promise<boolean> => {
    try {
      const jsonValue = JSON.stringify(documents);
      const storageKey = getDocumentsKey(userId);
      
      console.log(`💾 Sauvegarde de ${documents.length} documents...`);
      console.log(`🔑 Clé utilisée: ${storageKey}`);
      console.log(`🆔 userId fourni: ${userId || 'UNDEFINED'}`);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, jsonValue);
      } else {
        await AsyncStorage.setItem(storageKey, jsonValue);
      }
      
      console.log(`✅ Documents sauvegardés localement pour clé: ${storageKey}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde documents:', error);
      return false;
    }
  },

  // Récupérer tous les documents (nécessite userId)
  getDocuments: async (userId?: string): Promise<DocumentData[]> => {
    try {
      const storageKey = getDocumentsKey(userId);
      console.log('📂 Tentative de chargement depuis clé:', storageKey);
      let jsonValue = null;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        jsonValue = window.localStorage.getItem(storageKey);
      } else {
        jsonValue = await AsyncStorage.getItem(storageKey);
      }

      if (!jsonValue) {
        console.log(`📋 Aucun document trouvé pour clé: ${storageKey}`);
        console.log('💡 Vérification: userId fourni =', userId);
        return [];
      }

      const documents = JSON.parse(jsonValue);
      console.log(`✅ ${documents.length} documents chargés pour clé: ${storageKey}`);
      console.log('📄 Types de documents:', documents.map((d: DocumentData) => d.type).join(', '));
      return documents;
    } catch (error) {
      console.error('❌ Erreur lecture documents:', error);
      return [];
    }
  },

  // Récupérer un document par type (nécessite userId)
  getDocumentByType: async (type: DocumentType, userId?: string): Promise<DocumentData | null> => {
    try {
      const documents = await DocumentManager.getDocuments(userId);
      const doc = documents.find(d => d.type === type);
      return doc || null;
    } catch (error) {
      console.error(`❌ Erreur récupération document ${type}:`, error);
      return null;
    }
  },

  // Ajouter ou mettre à jour un document (nécessite userId)
  upsertDocument: async (document: DocumentData, userId?: string): Promise<boolean> => {
    try {
      const documents = await DocumentManager.getDocuments(userId);
      const existingIndex = documents.findIndex(d => d.type === document.type);

      if (existingIndex >= 0) {
        // Mise à jour
        documents[existingIndex] = {
          ...documents[existingIndex],
          ...document,
          uploadedAt: new Date().toISOString()
        };
        console.log(`🔄 Document ${document.type} mis à jour`);
      } else {
        // Création
        documents.push({
          ...document,
          id: `${document.type}_${Date.now()}`,
          uploadedAt: new Date().toISOString()
        });
        console.log(`➕ Document ${document.type} créé`);
      }

      return await DocumentManager.saveDocuments(documents, userId);
    } catch (error) {
      console.error('❌ Erreur upsert document:', error);
      return false;
    }
  },

  // Supprimer un document (nécessite userId)
  deleteDocument: async (type: DocumentType, userId?: string): Promise<boolean> => {
    try {
      const documents = await DocumentManager.getDocuments(userId);
      const filtered = documents.filter(d => d.type !== type);
      
      console.log(`🗑️ Document ${type} supprimé`);
      return await DocumentManager.saveDocuments(filtered, userId);
    } catch (error) {
      console.error('❌ Erreur suppression document:', error);
      return false;
    }
  },

  // ========================================
  // FIREBASE STORAGE
  // ========================================

  // Upload image vers Firebase Storage
  uploadDocumentImage: async (
    type: DocumentType,
    imageUri: string,
    userId?: string
  ): Promise<string | null> => {
    try {
      console.log('📤 Upload image document...');
      console.log('  Type:', type);
      console.log('  URI:', imageUri);

      // Récupérer l'ID utilisateur (depuis ProfileManager si non fourni)
      let uid = userId;
      if (!uid) {
        const { ProfileManager } = await import('./ProfileManager');
        const profile = await ProfileManager.getProfile();
        uid = profile?.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'anonymous';
      }

      // Créer le nom du fichier
      const timestamp = Date.now();
      const fileName = `${type}_${timestamp}.jpg`;
      const storagePath = `documents/${uid}/${type}/${fileName}`;

      console.log('  📁 Chemin Firebase:', storagePath);

      // Convertir l'image en Blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      console.log('  📦 Taille blob:', blob.size, 'octets');

      // Upload vers Firebase
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);

      console.log('  ✅ Upload terminé');

      // Récupérer l'URL de téléchargement
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('  🔗 URL:', downloadUrl);

      return downloadUrl;
    } catch (error) {
      console.error('❌ Erreur upload image:', error);
      return null;
    }
  },

  // ========================================
  // HELPERS
  // ========================================

  // Effacer tous les documents (pour déconnexion/suppression compte)
  clearAllDocuments: async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(DOCUMENTS_KEY);
      } else {
        await AsyncStorage.removeItem(DOCUMENTS_KEY);
      }
      
      console.log('🗑️ Tous les documents effacés');
      return true;
    } catch (error) {
      console.error('❌ Erreur effacement documents:', error);
      return false;
    }
  },

  // Exporter les documents en JSON (pour backup)
  exportDocuments: async (): Promise<string> => {
    try {
      const documents = await DocumentManager.getDocuments();
      return JSON.stringify(documents, null, 2);
    } catch (error) {
      console.error('❌ Erreur export documents:', error);
      return '[]';
    }
  },

  // Importer des documents depuis JSON (pour restauration)
  importDocuments: async (jsonString: string): Promise<boolean> => {
    try {
      const documents = JSON.parse(jsonString);
      
      if (!Array.isArray(documents)) {
        throw new Error('Format JSON invalide');
      }

      return await DocumentManager.saveDocuments(documents);
    } catch (error) {
      console.error('❌ Erreur import documents:', error);
      return false;
    }
  },

  // Vérifier si tous les documents requis sont présents
  checkRequiredDocuments: async (): Promise<{
    complete: boolean;
    missing: DocumentType[];
  }> => {
    try {
      const documents = await DocumentManager.getDocuments();
      const requiredTypes: DocumentType[] = [
        'permis_taxi',
        'pocket_saaq',
        'inspection_mecanique',
        'inspection_taximetre'
      ];

      const existingTypes = documents.map(d => d.type);
      const missing = requiredTypes.filter(t => !existingTypes.includes(t));

      return {
        complete: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error('❌ Erreur vérification documents:', error);
      return { complete: false, missing: [] };
    }
  },

  // ========================================
  // DIAGNOSTIC TOOLS
  // ========================================

  // Debug: Lister toutes les clés de documents en AsyncStorage
  debugListAllDocumentKeys: async (): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const keys = Object.keys(window.localStorage).filter(k => k.includes('taxi_professional_documents'));
        console.log('🔍 [DEBUG] Clés localStorage trouvées:', keys);
        keys.forEach(key => {
          const data = window.localStorage.getItem(key);
          const docs = data ? JSON.parse(data) : [];
          console.log(`  - ${key}: ${docs.length} documents`);
        });
      } else {
        const allKeys = await AsyncStorage.getAllKeys();
        const docKeys = allKeys.filter(k => k.includes('taxi_professional_documents'));
        console.log('🔍 [DEBUG] Clés AsyncStorage trouvées:', docKeys);
        for (const key of docKeys) {
          const data = await AsyncStorage.getItem(key);
          const docs = data ? JSON.parse(data) : [];
          console.log(`  - ${key}: ${docs.length} documents`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur debug keys:', error);
    }
  },

  // Migrer les documents de la clé "guest" vers un userId spécifique
  migrateGuestDocuments: async (targetUserId: string): Promise<number> => {
    try {
      console.log('🔄 Début migration documents guest → userId:', targetUserId);
      
      // Charger documents depuis guest
      const guestDocs = await DocumentManager.getDocuments(undefined);
      
      if (guestDocs.length === 0) {
        console.log('📋 Aucun document guest à migrer');
        return 0;
      }
      
      // Sauvegarder avec le userId cible
      const success = await DocumentManager.saveDocuments(guestDocs, targetUserId);
      
      if (success) {
        console.log(`✅ ${guestDocs.length} documents migrés vers ${targetUserId}`);
        return guestDocs.length;
      } else {
        console.error('❌ Échec migration documents');
        return 0;
      }
    } catch (error) {
      console.error('❌ Erreur migration documents:', error);
      return 0;
    }
  }
};
