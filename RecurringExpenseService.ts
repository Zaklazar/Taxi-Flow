import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

import { db, COLLECTIONS } from './firebaseConfig';
import { addExpense } from './ExpenseService';
import type { Expense } from '../types/Accounting';

export const RecurringExpenseService = {
  checkAndCreateRecurringExpenses: async (driverId: string): Promise<number> => {
    try {
      console.log('🔁 Vérification dépenses récurrentes pour:', driverId);
      
      const q = query(
        collection(db, COLLECTIONS.EXPENSES),
        where('driverId', '==', driverId),
        where('isRecurring', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      let createdCount = 0;
      
      for (const doc of querySnapshot.docs) {
        const expense = { id: doc.id, ...doc.data() } as Expense;
        
        if (!expense.nextRecurringDate) {
          console.warn('⚠️ Dépense récurrente sans nextRecurringDate:', expense.id);
          continue;
        }
        
        const nextDate = expense.nextRecurringDate instanceof Timestamp 
          ? expense.nextRecurringDate.toDate() 
          : new Date(expense.nextRecurringDate);
        
        if (nextDate <= now) {
          console.log('📅 Création dépense récurrente:', {
            merchant: expense.merchant,
            amount: expense.total,
            nextDate: nextDate.toISOString()
          });
          
          await addExpense(
            {
              categoryId: expense.categoryId,
              merchant: expense.merchant,
              amountExclTax: expense.amountExclTax,
              tps: expense.tps,
              tvq: expense.tvq,
              total: expense.total,
              date: Timestamp.now(),
              paymentMethod: expense.paymentMethod || 'cash',
              source: 'manual',
              receiptUrl: '',
              notes: `Dépense récurrente auto-générée depuis ${expense.id}`,
              isRecurring: true,
              recurringFrequency: expense.recurringFrequency,
              nextRecurringDate: calculateNextDate(now, expense.recurringFrequency!)
            },
            driverId
          );
          
          createdCount++;
        }
      }
      
      if (createdCount > 0) {
        console.log(`✅ ${createdCount} dépense(s) récurrente(s) créée(s)`);
      } else {
        console.log('✅ Aucune dépense récurrente à créer');
      }
      
      return createdCount;
      
    } catch (error) {
      console.error('❌ Erreur vérification dépenses récurrentes:', error);
      return 0;
    }
  }
};

function calculateNextDate(currentDate: Date, frequency: 'weekly' | 'biweekly' | 'monthly'): Timestamp {
  const nextDate = new Date(currentDate);
  
  if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'biweekly') {
    nextDate.setDate(nextDate.getDate() + 14);
  } else if (frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return Timestamp.fromDate(nextDate);
}
