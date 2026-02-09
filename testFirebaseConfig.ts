/**
 * Script de test de configuration Firebase
 * 
 * Exécutez ce script pour vérifier que :
 * 1. Les variables d'environnement sont chargées
 * 2. Firebase est correctement configuré
 * 3. Les services sont accessibles
 * 
 * Usage :
 * - Dans votre app React Native, importez ce fichier une fois
 * - Vérifiez les logs dans la console
 */

import { isFirebaseConfigured, getFirebaseStatus, db, storage, auth } from './firebaseConfig';

/**
 * Test de configuration Firebase
 */
export const testFirebaseConfiguration = () => {
  console.log('\n🔥 === TEST CONFIGURATION FIREBASE ===\n');

  // 1. Vérifier les variables d'environnement
  console.log('📋 Variables d\'environnement:');
  const envVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Masquer l'API key pour sécurité
      if (varName === 'EXPO_PUBLIC_FIREBASE_API_KEY') {
        console.log(`   ✅ ${varName}: ${value.substring(0, 10)}...`);
      } else {
        console.log(`   ✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`   ❌ ${varName}: NON DÉFINIE`);
    }
  });

  // 2. Vérifier le statut Firebase
  console.log('\n🔥 Status Firebase:');
  const status = getFirebaseStatus();
  console.log(`   Initialized: ${status.initialized ? '✅' : '❌'}`);
  console.log(`   Configured: ${status.configured ? '✅' : '❌'}`);
  console.log(`   Project ID: ${status.projectId || 'NON CONFIGURÉ'}`);

  // 3. Vérifier les services
  console.log('\n🛠️ Services Firebase:');
  try {
    console.log(`   Firestore (db): ${db ? '✅' : '❌'}`);
    console.log(`   Storage: ${storage ? '✅' : '❌'}`);
    console.log(`   Auth: ${auth ? '✅' : '❌'}`);
  } catch (error) {
    console.error('   ❌ Erreur lors de la vérification des services:', error);
  }

  // 4. Résumé
  console.log('\n📊 Résumé:');
  if (isFirebaseConfigured()) {
    console.log('   ✅ Firebase est CORRECTEMENT CONFIGURÉ');
    console.log('   ✅ Vous pouvez utiliser les services backend');
  } else {
    console.log('   ❌ Firebase N\'EST PAS configuré');
    console.log('   📝 Créez un fichier .env avec vos credentials Firebase');
    console.log('   📖 Consultez CONFIGURATION_FIREBASE.md pour les instructions');
  }

  console.log('\n=== FIN DU TEST ===\n');

  return isFirebaseConfigured();
};

/**
 * Test de connexion Firestore (lecture simple)
 */
export const testFirestoreConnection = async () => {
  console.log('\n🔥 === TEST CONNEXION FIRESTORE ===\n');

  try {
    const { collection, getDocs } = await import('firebase/firestore');
    
    // Tenter de lire une collection (même vide)
    const testCollection = collection(db, 'test_connection');
    const snapshot = await getDocs(testCollection);
    
    console.log('   ✅ Connexion Firestore réussie');
    console.log(`   📊 Documents dans 'test_connection': ${snapshot.size}`);
    
    return true;
  } catch (error: any) {
    console.error('   ❌ Erreur de connexion Firestore:');
    console.error(`      ${error.message}`);
    
    if (error.code === 'permission-denied') {
      console.log('\n   ℹ️ Vérifiez vos règles de sécurité Firestore');
    } else if (error.code === 'failed-precondition') {
      console.log('\n   ℹ️ Firestore n\'est peut-être pas activé dans Firebase Console');
    }
    
    return false;
  }
};

/**
 * Test de connexion Storage (lecture simple)
 */
export const testStorageConnection = async () => {
  console.log('\n🔥 === TEST CONNEXION STORAGE ===\n');

  try {
    const { ref, listAll } = await import('firebase/storage');
    
    // Tenter de lister les fichiers à la racine
    const storageRef = ref(storage, '/');
    const result = await listAll(storageRef);
    
    console.log('   ✅ Connexion Storage réussie');
    console.log(`   📊 Fichiers/Dossiers à la racine: ${result.items.length + result.prefixes.length}`);
    
    return true;
  } catch (error: any) {
    console.error('   ❌ Erreur de connexion Storage:');
    console.error(`      ${error.message}`);
    
    if (error.code === 'storage/unauthorized') {
      console.log('\n   ℹ️ Vérifiez vos règles de sécurité Storage');
    } else if (error.code === 'storage/unknown') {
      console.log('\n   ℹ️ Storage n\'est peut-être pas activé dans Firebase Console');
    }
    
    return false;
  }
};

/**
 * Test complet de la configuration
 */
export const runFullFirebaseTest = async () => {
  const configOk = testFirebaseConfiguration();
  
  if (!configOk) {
    console.log('\n⚠️ Configuration Firebase manquante. Tests de connexion ignorés.\n');
    return false;
  }

  console.log('\n⏳ Tests de connexion en cours...\n');

  const firestoreOk = await testFirestoreConnection();
  const storageOk = await testStorageConnection();

  console.log('\n📊 === RÉSULTATS FINAUX ===\n');
  console.log(`   Configuration: ${configOk ? '✅' : '❌'}`);
  console.log(`   Firestore: ${firestoreOk ? '✅' : '❌'}`);
  console.log(`   Storage: ${storageOk ? '✅' : '❌'}`);
  
  if (configOk && firestoreOk && storageOk) {
    console.log('\n🎉 Tout fonctionne parfaitement! Vous pouvez utiliser Firebase.\n');
    return true;
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Consultez les logs ci-dessus.\n');
    return false;
  }
};

// Export par défaut
export default {
  testFirebaseConfiguration,
  testFirestoreConnection,
  testStorageConnection,
  runFullFirebaseTest
};
