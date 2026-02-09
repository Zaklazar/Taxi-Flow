/**
 * StripeService.ts
 * 
 * Service pour gérer les paiements Stripe côté client
 * Utilise Firebase Cloud Functions pour la sécurité
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { Linking } from 'react-native';
import { STRIPE_PRICE_IDS, PRODUCTS } from '../config/stripeConfig';

const functions = getFunctions();

export interface CheckoutSessionData {
  sessionId: string;
  url: string;
}

export type ProductType = 'essential' | 'premium';

/**
 * Créer une session de paiement Stripe
 * 
 * @param productType - Type de produit ('essential' ou 'premium')
 * @returns Session de paiement Stripe
 */
export const createCheckoutSession = async (
  productType: ProductType
): Promise<CheckoutSessionData> => {
  try {
    const product = PRODUCTS[productType];
    
    if (!product) {
      throw new Error(`Produit invalide: ${productType}`);
    }

    console.log(`🛒 Création session paiement pour: ${product.name}`);

    // Appeler la Cloud Function
    const createSession = httpsCallable<
      { priceId: string; productType: string },
      CheckoutSessionData
    >(functions, 'createCheckoutSession');

    const result = await createSession({
      priceId: product.priceId,
      productType: productType
    });

    console.log('✅ Session créée:', result.data.sessionId);

    return result.data;
  } catch (error: any) {
    console.error('❌ Erreur création session:', error);
    throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
  }
};

/**
 * Ouvrir la page de paiement Stripe dans le navigateur
 * 
 * @param sessionUrl - URL de la session de paiement
 */
export const openCheckoutPage = async (sessionUrl: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(sessionUrl);
    
    if (!canOpen) {
      throw new Error('Impossible d\'ouvrir l\'URL de paiement');
    }

    await Linking.openURL(sessionUrl);
    console.log('✅ Page de paiement ouverte');
  } catch (error: any) {
    console.error('❌ Erreur ouverture paiement:', error);
    throw new Error('Impossible d\'ouvrir la page de paiement');
  }
};

/**
 * Gérer le retour après paiement (deep link)
 * 
 * @param url - URL du deep link (taxiflow://payment-success ou taxiflow://payment-cancel)
 */
export const handlePaymentDeepLink = (url: string): 'success' | 'cancel' | null => {
  if (url.includes('payment-success')) {
    console.log('✅ Paiement réussi');
    return 'success';
  } else if (url.includes('payment-cancel')) {
    console.log('❌ Paiement annulé');
    return 'cancel';
  }
  return null;
};

/**
 * Initier le processus de paiement complet
 * 
 * @param productType - Type de produit à acheter
 */
export const initiatePurchase = async (productType: ProductType): Promise<void> => {
  try {
    // 1. Créer la session de paiement
    const session = await createCheckoutSession(productType);

    // 2. Ouvrir la page de paiement Stripe
    await openCheckoutPage(session.url);

    // Le webhook Stripe gérera automatiquement la mise à jour de l'abonnement
  } catch (error: any) {
    console.error('❌ Erreur initiatePurchase:', error);
    throw error;
  }
};

/**
 * Service Stripe exporté
 */
export const StripeService = {
  createCheckoutSession,
  openCheckoutPage,
  handlePaymentDeepLink,
  initiatePurchase
};
