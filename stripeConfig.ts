/**
 * stripeConfig.ts
 * 
 * Configuration Stripe pour TaxiFlow
 * Mode: TEST (aucune transaction réelle)
 */

// Clé publique Stripe (Mode Test)
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SsvaH2NCikTuIq42g636bzWD77TLYJk0oPkboQ7KIauMDCSNy2DFA5ATuzeOQdP8spivy4Uirp3MVWT03AnlBS000JEPhyWVx';

/**
 * Prix IDs des produits Stripe
 * Créés dans le dashboard Stripe: https://dashboard.stripe.com/test/products
 */
export const STRIPE_PRICE_IDS = {
  // Accès Essentiel - Paiement unique 29,99 CAD
  essential: 'price_1StID32NCikTuIq4I1LKv5r5',
  
  // Premium - Abonnement mensuel 9,99 CAD
  premium: 'price_1StIGZ2NCikTuIq4TcdlWpcO'
};

/**
 * Configuration des produits
 */
export const PRODUCTS = {
  essential: {
    id: 'essential',
    name: 'Accès Essentiel',
    price: 29.99,
    currency: 'CAD',
    type: 'one_time' as const,
    priceId: STRIPE_PRICE_IDS.essential
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    currency: 'CAD',
    type: 'recurring' as const,
    interval: 'month' as const,
    priceId: STRIPE_PRICE_IDS.premium
  }
};

/**
 * Cartes de test Stripe
 * Source: https://stripe.com/docs/testing
 */
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
  requiresAuth: '4000 0025 0000 3155'
};
