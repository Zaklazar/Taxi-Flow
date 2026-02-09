import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Alert,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Colors = {
  background: '#18181B',
  card: '#FFFFFF',
  textMain: '#1F2937',
  textHeader: '#FFFFFF',
  textSub: '#6B7280',
  gold: '#FBBF24',
  danger: '#EF4444',
  success: '#22C55E',
};

const STORAGE_KEY = '@conducteur_b_documents';

export default function ConducteurBScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [permis, setPermis] = useState<any>(null);
  const [assurance, setAssurance] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    chargerDocuments();
  }, []);

  const chargerDocuments = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const docs = JSON.parse(data);
        setPermis(docs.permis || null);
        setAssurance(docs.assurance || null);
        setIsComplete(docs.permis && docs.assurance);
      }
    } catch (error) {
      console.error('❌ Erreur chargement documents conducteur B:', error);
    }
  };

  const supprimerDocument = async (type: 'permis' | 'assurance') => {
    Alert.alert(
      t('common.confirmation'),
      `Supprimer ${type === 'permis' ? 'le permis' : 'l\'assurance'} du conducteur B ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await AsyncStorage.getItem(STORAGE_KEY);
              const docs = data ? JSON.parse(data) : {};
              
              if (type === 'permis') {
                delete docs.permis;
                setPermis(null);
              } else {
                delete docs.assurance;
                setAssurance(null);
              }
              
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
              setIsComplete(docs.permis && docs.assurance);
              Alert.alert(t('common.success'), 'Document supprimé');
            } catch (error) {
              Alert.alert(t('common.error'), 'Erreur lors de la suppression');
            }
          }
        }
      ]
    );
  };

  const scannerPermis = () => {
    router.push('/conducteurB/scanPermis');
  };

  const scannerAssurance = () => {
    router.push('/conducteurB/scanAssurance');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conducteur B (Autre partie)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 40}}>
        
        {/* STATUT */}
        <View style={[styles.statusCard, { backgroundColor: isComplete ? Colors.success + '20' : Colors.danger + '10' }]}>
          <MaterialCommunityIcons 
            name={isComplete ? "check-circle" : "alert-circle"} 
            size={32} 
            color={isComplete ? Colors.success : Colors.danger} 
          />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.statusTitle, { color: isComplete ? Colors.success : Colors.danger }]}>
              {isComplete ? 'Documents complets' : 'Documents manquants'}
            </Text>
            <Text style={styles.statusText}>
              {isComplete 
                ? 'Permis et assurance enregistrés' 
                : 'Scannez le permis et l\'assurance du conducteur B'}
            </Text>
          </View>
        </View>

        {/* PERMIS CLASSE 5 */}
        <Text style={styles.sectionTitle}>Permis Classe 5</Text>
        
        {permis ? (
          <View style={styles.docCard}>
            <Image source={{ uri: permis.imageUri }} style={styles.docImage} />
            <View style={styles.docInfo}>
              <View style={styles.docHeader}>
                <MaterialCommunityIcons name="card-account-details" size={24} color={Colors.success} />
                <Text style={styles.docTitle}>Permis enregistré</Text>
              </View>
              <Text style={styles.docDetail}>Nom: {permis.fullName || 'N/A'}</Text>
              <Text style={styles.docDetail}>N°: {permis.documentNumber || 'N/A'}</Text>
              <Text style={styles.docDetail}>Expiration: {permis.expirationDate || 'N/A'}</Text>
              <View style={styles.docActions}>
                <TouchableOpacity 
                  style={styles.btnView}
                  onPress={() => Alert.alert('Permis', `Nom: ${permis.fullName}\nN°: ${permis.documentNumber}\nExpiration: ${permis.expirationDate}\nAdresse: ${permis.address || 'N/A'}`)}
                >
                  <MaterialCommunityIcons name="eye" size={18} color={Colors.gold} />
                  <Text style={styles.btnViewText}>Voir</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.btnDelete}
                  onPress={() => supprimerDocument('permis')}
                >
                  <MaterialCommunityIcons name="delete" size={18} color={Colors.danger} />
                  <Text style={styles.btnDeleteText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addCard} onPress={scannerPermis}>
            <MaterialCommunityIcons name="card-account-details-outline" size={48} color={Colors.gold} />
            <Text style={styles.addTitle}>Scanner le permis</Text>
            <Text style={styles.addSub}>Permis de conduire classe 5 du conducteur B</Text>
            <View style={styles.btnAdd}>
              <MaterialCommunityIcons name="camera" size={20} color="#000" />
              <Text style={styles.btnAddText}>Ouvrir la caméra</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ASSURANCE */}
        <Text style={styles.sectionTitle}>Assurance</Text>
        
        {assurance ? (
          <View style={styles.docCard}>
            <Image source={{ uri: assurance.imageUri }} style={styles.docImage} />
            <View style={styles.docInfo}>
              <View style={styles.docHeader}>
                <MaterialCommunityIcons name="shield-car" size={24} color={Colors.success} />
                <Text style={styles.docTitle}>Assurance enregistrée</Text>
              </View>
              <Text style={styles.docDetail}>Compagnie: {assurance.insuranceCompany || 'N/A'}</Text>
              <Text style={styles.docDetail}>N° Police: {assurance.documentNumber || 'N/A'}</Text>
              <Text style={styles.docDetail}>Expiration: {assurance.expirationDate || 'N/A'}</Text>
              <View style={styles.docActions}>
                <TouchableOpacity 
                  style={styles.btnView}
                  onPress={() => Alert.alert('Assurance', `Compagnie: ${assurance.insuranceCompany}\nN° Police: ${assurance.documentNumber}\nExpiration: ${assurance.expirationDate}`)}
                >
                  <MaterialCommunityIcons name="eye" size={18} color={Colors.gold} />
                  <Text style={styles.btnViewText}>Voir</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.btnDelete}
                  onPress={() => supprimerDocument('assurance')}
                >
                  <MaterialCommunityIcons name="delete" size={18} color={Colors.danger} />
                  <Text style={styles.btnDeleteText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addCard} onPress={scannerAssurance}>
            <MaterialCommunityIcons name="shield-car-outline" size={48} color={Colors.gold} />
            <Text style={styles.addTitle}>Scanner l'assurance</Text>
            <Text style={styles.addSub}>Certificat d'assurance du véhicule B</Text>
            <View style={styles.btnAdd}>
              <MaterialCommunityIcons name="camera" size={20} color="#000" />
              <Text style={styles.btnAddText}>Ouvrir la caméra</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* BOUTON RETOUR */}
        <TouchableOpacity 
          style={styles.btnBack}
          onPress={() => router.back()}
        >
          <Text style={styles.btnBackText}>Retour au constat</Text>
        </TouchableOpacity>

      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSub,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textHeader,
    marginBottom: 15,
    marginTop: 10,
  },
  docCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  docImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  docInfo: {
    gap: 8,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textMain,
  },
  docDetail: {
    fontSize: 14,
    color: Colors.textSub,
  },
  docActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnView: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  btnViewText: {
    color: Colors.gold,
    fontWeight: '600',
  },
  btnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnDeleteText: {
    color: Colors.danger,
    fontWeight: '600',
  },
  addCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
  },
  addTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginTop: 15,
  },
  addSub: {
    fontSize: 14,
    color: Colors.textSub,
    marginTop: 5,
    textAlign: 'center',
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  btnAddText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnBack: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnBackText: {
    color: Colors.textHeader,
    fontWeight: '600',
    fontSize: 14,
  },
});
