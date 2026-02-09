import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StripeService, ProductType } from '../src/services/StripeService';

const Colors = {
  background: '#0F1419',
  card: '#1C2432',
  cardBorder: '#2A3444',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  goldDark: '#D97706',
  blue: '#3B82F6',
  blueDark: '#2563EB',
  success: '#22C55E',
  border: '#3F3F46'
};

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProductType | null>(null);

  const handleSubscribe = async (plan: ProductType) => {
    setLoading(true);
    setSelectedPlan(plan);

    try {
      console.log('🛒 Démarrage achat:', plan);

      // Initier le processus de paiement Stripe
      await StripeService.initiatePurchase(plan);

      // L'utilisateur sera redirigé vers Stripe
      // Le webhook gérera automatiquement la mise à jour après paiement

    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      
      Alert.alert(
        t('paywall.errorTitle') || 'Erreur',
        error.message || t('paywall.errorMessage') || 'Une erreur est survenue lors du paiement',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('paywall.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plans Container */}
        <View style={styles.plansContainer}>
          
          {/* PLAN ESSENTIEL */}
          <View style={styles.planCard}>
            {/* Badge */}
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>{t('paywall.essential.badge')}</Text>
            </View>

            {/* Titre */}
            <Text style={styles.planTitle}>{t('paywall.essential.title')}</Text>

            {/* Prix */}
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>0,00 $</Text>
              <Text style={styles.pricePeriod}> / {t('paywall.essential.period')}</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresList}>
              <FeatureItem text={t('paywall.essential.feature1')} />
              <FeatureItem text={t('paywall.essential.feature2')} />
              <FeatureItem text={t('paywall.essential.feature3')} />
              <FeatureItem text={t('paywall.essential.feature4')} />
              <FeatureItem text={t('paywall.essential.feature5')} />
            </View>

            {/* Bouton */}
            <TouchableOpacity 
              style={[styles.buttonOutline, (loading && selectedPlan === 'essential') && styles.buttonDisabled]}
              onPress={() => handleSubscribe('essential')}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading && selectedPlan === 'essential' ? (
                <ActivityIndicator size="small" color={Colors.textMain} />
              ) : (
                <Text style={styles.buttonOutlineText}>{t('paywall.essential.button')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* PLAN PREMIUM */}
          <View style={[styles.planCard, styles.planCardPremium]}>
            {/* Badge Populaire */}
            <View style={styles.badgeGold}>
              <Text style={styles.badgeTextDark}>{t('paywall.premium.badge')}</Text>
            </View>

            {/* Label 7 jours gratuits */}
            <View style={styles.trialLabel}>
              <Text style={styles.trialText}>{t('paywall.premium.trial')}</Text>
            </View>

            {/* Titre */}
            <Text style={styles.planTitle}>{t('paywall.premium.title')}</Text>

            {/* Prix */}
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>0,00 $</Text>
              <Text style={styles.pricePeriod}> / {t('paywall.premium.period')}</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresList}>
              <FeatureItem text={t('paywall.premium.feature1')} gold />
              <FeatureItem text={t('paywall.premium.feature2')} gold />
              <FeatureItem text={t('paywall.premium.feature3')} gold />
              <FeatureItem text={t('paywall.premium.feature4')} gold />
              <FeatureItem text={t('paywall.premium.feature5')} gold />
              <FeatureItem text={t('paywall.premium.feature6')} gold />
              <FeatureItem text={t('paywall.premium.feature7')} gold />
              <FeatureItem text={t('paywall.premium.feature8')} gold />
            </View>

            {/* Bouton Premium */}
            <TouchableOpacity 
              style={[styles.buttonPremium, (loading && selectedPlan === 'premium') && styles.buttonDisabled]}
              onPress={() => handleSubscribe('premium')}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={loading && selectedPlan === 'premium' ? ['#6B7280', '#4B5563'] : ['#FBBF24', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading && selectedPlan === 'premium' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.buttonPremiumText}>{t('paywall.premium.button')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info annulation */}
            <Text style={styles.cancelInfo}>{t('paywall.premium.cancelInfo')}</Text>
          </View>

        </View>

        {/* Note Scanner OBD2 */}
        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="information" size={20} color={Colors.gold} />
          <Text style={styles.noteText}>
            {t('paywall.obd2Note')}
          </Text>
        </View>

        {/* Footer info */}
        <Text style={styles.footerText}>
          {t('paywall.footer')}
        </Text>
      </ScrollView>
    </View>
  );
}

interface FeatureItemProps {
  text: string;
  gold?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, gold = false }) => (
  <View style={styles.featureItem}>
    <MaterialCommunityIcons 
      name="check" 
      size={20} 
      color={gold ? Colors.gold : Colors.blue} 
    />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textMain
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  plansContainer: {
    flexDirection: 'column',
    gap: 15,
    marginBottom: 25
  },
  planCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    position: 'relative'
  },
  planCardPremium: {
    borderColor: Colors.gold,
    borderWidth: 2
  },
  badgeBlue: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15
  },
  badgeGold: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  badgeTextDark: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  trialLabel: {
    alignSelf: 'flex-end',
    marginBottom: 10
  },
  trialText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.gold
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 12
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textMain
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.textSub
  },
  featuresList: {
    gap: 12,
    marginBottom: 25
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  featureText: {
    fontSize: 14,
    color: Colors.textMain,
    flex: 1,
    lineHeight: 20
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: Colors.textMain,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonOutlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textMain
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonPremium: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  buttonPremiumText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000'
  },
  cancelInfo: {
    fontSize: 11,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 16
  },
  noteCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSub,
    lineHeight: 18
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 16
  }
});
