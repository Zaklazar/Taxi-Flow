import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  error: '#EF4444'
};

export default function SecuriteScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('security.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
            <Text style={styles.sectionTitle}>{t('security.dataProtectionTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>
            {t('security.dataProtectionText')}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={Colors.gold} />
            <Text style={styles.sectionTitle}>{t('security.authenticationTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>
            {t('security.authenticationText')}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lock" size={24} color={Colors.textSub} />
            <Text style={styles.sectionTitle}>{t('security.backupTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>
            {t('security.backupText')}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.error} />
            <Text style={styles.sectionTitle}>{t('security.recommendationsTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>
            {t('security.recommendationsText')}
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  backBtn: { padding: 5 },
  
  content: { padding: 20 },
  section: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 15 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textMain },
  sectionText: { fontSize: 14, color: Colors.textSub, lineHeight: 20 }
});
