import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface FAQItem {
  questionKey: string;
  answerKey: string;
  categoryKey: string;
}

const faqData: FAQItem[] = [
  {
    questionKey: "faq.q1Question",
    answerKey: "faq.q1Answer",
    categoryKey: "faq.categoryProfile"
  },
  {
    questionKey: "faq.q2Question",
    answerKey: "faq.q2Answer",
    categoryKey: "faq.categoryProfile"
  },
  {
    questionKey: "faq.q3Question",
    answerKey: "faq.q3Answer",
    categoryKey: "faq.categoryDocuments"
  },
  {
    questionKey: "faq.q4Question",
    answerKey: "faq.q4Answer",
    categoryKey: "faq.categoryDocuments"
  },
  {
    questionKey: "faq.q5Question",
    answerKey: "faq.q5Answer",
    categoryKey: "faq.categoryAccounting"
  },
  {
    questionKey: "faq.q6Question",
    answerKey: "faq.q6Answer",
    categoryKey: "faq.categoryAccounting"
  },
  {
    questionKey: "faq.q7Question",
    answerKey: "faq.q7Answer",
    categoryKey: "faq.categoryTechnical"
  },
  {
    questionKey: "faq.q8Question",
    answerKey: "faq.q8Answer",
    categoryKey: "faq.categoryTechnical"
  }
];

export default function FAQScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getFAQByCategory = (categoryKey: string) => {
    return faqData.filter(item => item.categoryKey === categoryKey);
  };

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
    category: {
      marginBottom: 25,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      paddingHorizontal: 5,
    },
    faqItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    faqQuestion: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    questionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 22,
    },
    expandIcon: {
      marginLeft: 10,
    },
    faqAnswer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.background + '50',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    answerText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textLight,
    },
    searchContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 10,
    },
    noResults: {
      textAlign: 'center',
      fontSize: 16,
      color: colors.textLight,
      marginTop: 20,
      fontStyle: 'italic',
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
        <Text style={styles.headerTitle}>{t('faq.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textLight} />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('faq.searchPlaceholder')}
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Catégorie: Profil */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>{t('faq.categoryProfile')}</Text>
          {getFAQByCategory('faq.categoryProfile').map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity 
                style={styles.faqQuestion}
                onPress={() => toggleItem(index)}
              >
                <Text style={styles.questionText}>{t(item.questionKey)}</Text>
                <MaterialCommunityIcons 
                  name={expandedItems.includes(index) ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.accent} 
                  style={styles.expandIcon}
                />
              </TouchableOpacity>
              
              {expandedItems.includes(index) && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{t(item.answerKey)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Catégorie: Documents */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>{t('faq.categoryDocuments')}</Text>
          {getFAQByCategory('faq.categoryDocuments').map((item, index) => {
            const globalIndex = faqData.findIndex(faq => faq.questionKey === item.questionKey);
            return (
              <View key={globalIndex} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqQuestion}
                  onPress={() => toggleItem(globalIndex)}
                >
                  <Text style={styles.questionText}>{t(item.questionKey)}</Text>
                  <MaterialCommunityIcons 
                    name={expandedItems.includes(globalIndex) ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.accent} 
                    style={styles.expandIcon}
                  />
                </TouchableOpacity>
                
                {expandedItems.includes(globalIndex) && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.answerText}>{t(item.answerKey)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Catégorie: Comptabilité */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>{t('faq.categoryAccounting')}</Text>
          {getFAQByCategory('faq.categoryAccounting').map((item, index) => {
            const globalIndex = faqData.findIndex(faq => faq.questionKey === item.questionKey);
            return (
              <View key={globalIndex} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqQuestion}
                  onPress={() => toggleItem(globalIndex)}
                >
                  <Text style={styles.questionText}>{t(item.questionKey)}</Text>
                  <MaterialCommunityIcons 
                    name={expandedItems.includes(globalIndex) ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.accent} 
                    style={styles.expandIcon}
                  />
                </TouchableOpacity>
                
                {expandedItems.includes(globalIndex) && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.answerText}>{t(item.answerKey)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Catégorie: Technique */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>{t('faq.categoryTechnical')}</Text>
          {getFAQByCategory('faq.categoryTechnical').map((item, index) => {
            const globalIndex = faqData.findIndex(faq => faq.questionKey === item.questionKey);
            return (
              <View key={globalIndex} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqQuestion}
                  onPress={() => toggleItem(globalIndex)}
                >
                  <Text style={styles.questionText}>{t(item.questionKey)}</Text>
                  <MaterialCommunityIcons 
                    name={expandedItems.includes(globalIndex) ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.accent} 
                    style={styles.expandIcon}
                  />
                </TouchableOpacity>
                
                {expandedItems.includes(globalIndex) && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.answerText}>{t(item.answerKey)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
