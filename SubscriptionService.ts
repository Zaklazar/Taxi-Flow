import { getFirestore, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export type SubscriptionStatus = 'trial' | 'premium' | 'expired';

export interface SubscriptionData {
  userId: string;
  status: SubscriptionStatus;
  is_premium: boolean;
  
  // Trial data
  trial_start_date: string;
  trial_end_date: string;
  trial_scan_quota: number;
  trial_scans_used: number;
  
  // Premium data
  premium_start_date?: string;
  premium_end_date?: string;
  monthly_scan_quota: number;
  monthly_scans_used: number;
  daily_fallback_quota: number;
  daily_fallback_used: number;
  last_reset_date: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

const TRIAL_DAYS = 7;
const TRIAL_SCAN_QUOTA = 30;
const PREMIUM_MONTHLY_QUOTA = 200;
const PREMIUM_DAILY_FALLBACK = 5;

export class SubscriptionService {
  private static db = getFirestore();
  
  /**
   * Initialiser l'abonnement lors de la création du compte
   */
  static async initializeSubscription(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      
      const subscriptionData: SubscriptionData = {
        userId,
        status: 'trial',
        is_premium: false,
        
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
        trial_scan_quota: TRIAL_SCAN_QUOTA,
        trial_scans_used: 0,
        
        monthly_scan_quota: 0,
        monthly_scans_used: 0,
        daily_fallback_quota: 0,
        daily_fallback_used: 0,
        last_reset_date: now.toISOString(),
        
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      await setDoc(doc(this.db, 'subscriptions', userId), subscriptionData);
      return true;
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur init subscription:', error);
      return false;
    }
  }
  
  /**
   * Récupérer les données d'abonnement
   */
  static async getSubscription(userId?: string): Promise<SubscriptionData | null> {
    try {
      const uid = userId || getAuth().currentUser?.uid;
      if (!uid) return null;
      
      const docRef = doc(this.db, 'subscriptions', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as SubscriptionData;
      }
      
      // Si pas de subscription, initialiser
      await this.initializeSubscription(uid);
      return await this.getSubscription(uid);
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur get subscription:', error);
      return null;
    }
  }
  
  /**
   * Vérifier si l'utilisateur peut scanner
   */
  static async canScan(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    try {
      const subscription = await this.getSubscription();
      if (!subscription) {
        return { allowed: false, reason: 'no_subscription' };
      }
      
      // Vérifier reset mensuel si premium
      if (subscription.is_premium) {
        await this.checkAndResetMonthlyQuota(subscription);
      }
      
      // Vérifier reset journalier du fallback
      await this.checkAndResetDailyFallback(subscription);
      
      // Recharger après les resets potentiels
      const updatedSub = await this.getSubscription();
      if (!updatedSub) return { allowed: false, reason: 'no_subscription' };
      
      // MODE TRIAL
      if (updatedSub.status === 'trial') {
        const trialExpired = new Date(updatedSub.trial_end_date) < new Date();
        const quotaExceeded = updatedSub.trial_scans_used >= updatedSub.trial_scan_quota;
        
        if (trialExpired || quotaExceeded) {
          await this.expireSubscription(updatedSub.userId);
          return { 
            allowed: false, 
            reason: trialExpired ? 'trial_expired' : 'trial_quota_exceeded',
            remaining: 0
          };
        }
        
        return { 
          allowed: true, 
          remaining: updatedSub.trial_scan_quota - updatedSub.trial_scans_used 
        };
      }
      
      // MODE PREMIUM
      if (updatedSub.status === 'premium' && updatedSub.is_premium) {
        // Vérifier quota mensuel
        if (updatedSub.monthly_scans_used < updatedSub.monthly_scan_quota) {
          return { 
            allowed: true, 
            remaining: updatedSub.monthly_scan_quota - updatedSub.monthly_scans_used 
          };
        }
        
        // Si quota mensuel épuisé, vérifier fallback journalier
        if (updatedSub.daily_fallback_used < updatedSub.daily_fallback_quota) {
          return { 
            allowed: true, 
            remaining: updatedSub.daily_fallback_quota - updatedSub.daily_fallback_used 
          };
        }
        
        return { 
          allowed: false, 
          reason: 'daily_quota_exceeded',
          remaining: 0
        };
      }
      
      // Abonnement expiré
      return { allowed: false, reason: 'subscription_expired', remaining: 0 };
      
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur canScan:', error);
      return { allowed: false, reason: 'error' };
    }
  }
  
  /**
   * Incrémenter le compteur de scans
   */
  static async incrementScanCount(): Promise<boolean> {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) return false;
      
      const subscription = await this.getSubscription(userId);
      if (!subscription) return false;
      
      const docRef = doc(this.db, 'subscriptions', userId);
      
      if (subscription.status === 'trial') {
        await updateDoc(docRef, {
          trial_scans_used: increment(1),
          updatedAt: new Date().toISOString()
        });
      } else if (subscription.status === 'premium') {
        // Incrémenter quota mensuel si disponible, sinon fallback journalier
        if (subscription.monthly_scans_used < subscription.monthly_scan_quota) {
          await updateDoc(docRef, {
            monthly_scans_used: increment(1),
            updatedAt: new Date().toISOString()
          });
        } else {
          await updateDoc(docRef, {
            daily_fallback_used: increment(1),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      return true;
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur increment scan:', error);
      return false;
    }
  }
  
  /**
   * Activer l'abonnement premium
   */
  static async activatePremium(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      const premiumEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours
      
      const docRef = doc(this.db, 'subscriptions', userId);
      await updateDoc(docRef, {
        status: 'premium',
        is_premium: true,
        premium_start_date: now.toISOString(),
        premium_end_date: premiumEnd.toISOString(),
        monthly_scan_quota: PREMIUM_MONTHLY_QUOTA,
        monthly_scans_used: 0,
        daily_fallback_quota: PREMIUM_DAILY_FALLBACK,
        daily_fallback_used: 0,
        last_reset_date: now.toISOString(),
        updatedAt: now.toISOString()
      });
      
      return true;
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur activate premium:', error);
      return false;
    }
  }
  
  /**
   * Expirer l'abonnement
   */
  private static async expireSubscription(userId: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'subscriptions', userId);
      await updateDoc(docRef, {
        status: 'expired',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur expire subscription:', error);
    }
  }
  
  /**
   * Vérifier et reset quota mensuel si nécessaire
   */
  private static async checkAndResetMonthlyQuota(subscription: SubscriptionData): Promise<void> {
    try {
      const now = new Date();
      const lastReset = new Date(subscription.last_reset_date);
      
      // Vérifier si on est dans un nouveau mois
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        const docRef = doc(this.db, 'subscriptions', subscription.userId);
        await updateDoc(docRef, {
          monthly_scans_used: 0,
          daily_fallback_used: 0,
          last_reset_date: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur reset monthly quota:', error);
    }
  }
  
  /**
   * Vérifier et reset quota journalier du fallback
   */
  private static async checkAndResetDailyFallback(subscription: SubscriptionData): Promise<void> {
    try {
      if (!subscription.is_premium) return;
      
      const now = new Date();
      const lastReset = new Date(subscription.last_reset_date);
      
      // Vérifier si on est dans un nouveau jour
      const isNewDay = now.getDate() !== lastReset.getDate() || 
                       now.getMonth() !== lastReset.getMonth() || 
                       now.getFullYear() !== lastReset.getFullYear();
      
      if (isNewDay && subscription.monthly_scans_used >= subscription.monthly_scan_quota) {
        const docRef = doc(this.db, 'subscriptions', subscription.userId);
        await updateDoc(docRef, {
          daily_fallback_used: 0,
          updatedAt: now.toISOString()
        });
      }
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur reset daily fallback:', error);
    }
  }
  
  /**
   * Obtenir un résumé de l'abonnement pour l'UI
   */
  static async getSubscriptionSummary() {
    const subscription = await this.getSubscription();
    if (!subscription) {
      return {
        status: 'none',
        isPremium: false,
        scansRemaining: 0,
        totalQuota: 0,
        percentUsed: 0
      };
    }
    
    if (subscription.status === 'trial') {
      const remaining = subscription.trial_scan_quota - subscription.trial_scans_used;
      return {
        status: 'trial',
        isPremium: false,
        scansRemaining: Math.max(0, remaining),
        totalQuota: subscription.trial_scan_quota,
        percentUsed: (subscription.trial_scans_used / subscription.trial_scan_quota) * 100,
        daysLeft: Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      };
    }
    
    if (subscription.status === 'premium') {
      const monthlyRemaining = subscription.monthly_scan_quota - subscription.monthly_scans_used;
      
      // Si quota mensuel épuisé, montrer quota journalier
      if (monthlyRemaining <= 0) {
        const dailyRemaining = subscription.daily_fallback_quota - subscription.daily_fallback_used;
        return {
          status: 'premium_fallback',
          isPremium: true,
          scansRemaining: Math.max(0, dailyRemaining),
          totalQuota: subscription.daily_fallback_quota,
          percentUsed: (subscription.daily_fallback_used / subscription.daily_fallback_quota) * 100,
          isFallbackMode: true
        };
      }
      
      return {
        status: 'premium',
        isPremium: true,
        scansRemaining: monthlyRemaining,
        totalQuota: subscription.monthly_scan_quota,
        percentUsed: (subscription.monthly_scans_used / subscription.monthly_scan_quota) * 100,
        isFallbackMode: false
      };
    }
    
    return {
      status: 'expired',
      isPremium: false,
      scansRemaining: 0,
      totalQuota: 0,
      percentUsed: 100
    };
  }
}
