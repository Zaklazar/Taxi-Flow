import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function LegalScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Fonction de styles dynamiques basée sur le thème
  const getStyles = (colors: any) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 15,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 15,
    },
    backBtn: {
      padding: 5,
    },
    content: {
      padding: 20,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
      marginBottom: 15,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    bullet: {
      color: colors.accent,
      fontSize: 16,
      marginRight: 10,
      marginTop: 3,
    },
    listText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    contactInfo: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    contactText: {
      fontSize: 16,
      color: colors.accent,
      marginBottom: 5,
    },
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Section 1: Informations sur l'application */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.appInfo')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.appDescription')}
          </Text>
          <Text style={styles.paragraph}>
            {t('legal.versionInfo', { version: '1.0.0' })}
          </Text>
        </View>

        {/* Section 2: Conditions d'utilisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.termsOfService')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.termsDescription')}
          </Text>
          
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{t('legal.term1')}</Text>
          </View>
          
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{t('legal.term2')}</Text>
          </View>
          
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{t('legal.term3')}</Text>
          </View>
        </View>

        {/* Section 3: Confidentialité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacyDescription')}
          </Text>
          
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{t('legal.privacyPoint1')}</Text>
          </View>
          
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{t('legal.privacyPoint2')}</Text>
          </View>
        </View>

        {/* Section 4: Responsabilités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.responsibilities')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.responsibilitiesDescription')}
          </Text>
        </View>

        {/* Section 5: Contact */}
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>{t('legal.contact')}</Text>
          <Text style={styles.contactText}>support@taxi-flow.com</Text>
          <Text style={styles.contactText}>+1 (555) 123-4567</Text>
          <Text style={styles.contactText}>www.taxi-flow.com</Text>
        </View>
      </ScrollView>
    </View>
  );
}
