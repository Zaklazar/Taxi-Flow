import { supabase } from '../lib/supabase';
import type { Expense, Income } from '../types/Accounting';

// Table Supabase pour les dépenses
// CREATE TABLE expenses (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   amount_excl_tax DECIMAL(10,2),
//   tps DECIMAL(10,2),
//   tvq DECIMAL(10,2),
//   total DECIMAL(10,2),
//   merchant TEXT,
//   category_id TEXT,
//   date TIMESTAMP WITH TIME ZONE,
//   payment_method TEXT,
//   source TEXT,
//   receipt_url TEXT,
//   notes TEXT,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );

// Table Supabase pour les revenus
// CREATE TABLE revenues (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   amount DECIMAL(10,2),
//   total DECIMAL(10,2),
//   description TEXT,
//   category_id TEXT,
//   payment_method TEXT,
//   source TEXT,
//   date TIMESTAMP WITH TIME ZONE,
//   driver_id TEXT,
//   origin TEXT,
//   destination TEXT,
//   distance INTEGER,
//   duration INTEGER,
//   notes TEXT,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );

export class SupabaseAccountingService {
  // Ajouter une dépense dans Supabase
  static async addExpenseToSupabase(expense: Omit<Expense, 'id'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: expense.driverId,
          amount_excl_tax: expense.amountExclTax,
          tps: expense.tps,
          tvq: expense.tvq,
          total: expense.total,
          merchant: expense.merchant,
          category_id: expense.categoryId,
          date: expense.date,
          payment_method: expense.paymentMethod,
          source: expense.source,
          receipt_url: expense.receiptUrl,
          notes: expense.notes,
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Erreur ajout dépense Supabase:', error);
        return null;
      }

      console.log('✅ Dépense ajoutée dans Supabase:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Erreur inattendue ajout dépense Supabase:', error);
      return null;
    }
  }

  // Ajouter un revenu dans Supabase
  static async addRevenueToSupabase(revenue: Omit<Income, 'id'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .insert({
          user_id: revenue.driverId,
          amount: revenue.amount,
          total: revenue.total,
          description: revenue.description,
          category_id: revenue.categoryId,
          payment_method: revenue.paymentMethod,
          source: revenue.source,
          date: revenue.date,
          driver_id: revenue.driverId,
          origin: revenue.origin,
          destination: revenue.destination,
          distance: revenue.distance,
          duration: revenue.duration,
          notes: revenue.notes,
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Erreur ajout revenu Supabase:', error);
        return null;
      }

      console.log('✅ Revenu ajouté dans Supabase:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Erreur inattendue ajout revenu Supabase:', error);
      return null;
    }
  }

  // Récupérer les dépenses d'un utilisateur
  static async getExpensesFromSupabase(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<Expense[]> {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Appliquer les filtres de date
      if (options.startDate) {
        query = query.gte('date', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate.toISOString());
      }

      // Limiter les résultats
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération dépenses Supabase:', error);
        return [];
      }

      // Transformer les données pour correspondre au type Expense
      const expenses: Expense[] = (data || []).map((item: any) => ({
        id: item.id,
        driverId: item.user_id,
        amountExclTax: item.amount_excl_tax,
        tps: item.tps,
        tvq: item.tvq,
        total: item.total,
        merchant: item.merchant,
        categoryId: item.category_id,
        date: item.date,
        paymentMethod: item.payment_method,
        source: item.source,
        receiptUrl: item.receipt_url,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      console.log(`✅ ${expenses.length} dépenses récupérées depuis Supabase`);
      return expenses;
    } catch (error) {
      console.error('❌ Erreur inattendue récupération dépenses Supabase:', error);
      return [];
    }
  }

  // Récupérer les revenus d'un utilisateur
  static async getRevenuesFromSupabase(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<Income[]> {
    try {
      let query = supabase
        .from('revenues')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Appliquer les filtres de date
      if (options.startDate) {
        query = query.gte('date', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate.toISOString());
      }

      // Limiter les résultats
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération revenus Supabase:', error);
        return [];
      }

      // Transformer les données pour correspondre au type Income
      const revenues: Income[] = (data || []).map((item: any) => ({
        id: item.id,
        driverId: item.user_id,
        amount: item.amount,
        total: item.total,
        description: item.description,
        categoryId: item.category_id,
        paymentMethod: item.payment_method,
        source: item.source,
        date: item.date,
        origin: item.origin,
        destination: item.destination,
        distance: item.distance,
        duration: item.duration,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      console.log(`✅ ${revenues.length} revenus récupérés depuis Supabase`);
      return revenues;
    } catch (error) {
      console.error('❌ Erreur inattendue récupération revenus Supabase:', error);
      return [];
    }
  }

  // Mettre à jour une dépense
  static async updateExpenseInSupabase(id: string, updates: Partial<Expense>): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Mapper les champs
      if (updates.amountExclTax !== undefined) updateData.amount_excl_tax = updates.amountExclTax;
      if (updates.tps !== undefined) updateData.tps = updates.tps;
      if (updates.tvq !== undefined) updateData.tvq = updates.tvq;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.merchant !== undefined) updateData.merchant = updates.merchant;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.source !== undefined) updateData.source = updates.source;
      if (updates.receiptUrl !== undefined) updateData.receipt_url = updates.receiptUrl;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('❌ Erreur mise à jour dépense Supabase:', error);
        return false;
      }

      console.log('✅ Dépense mise à jour dans Supabase:', id);
      return true;
    } catch (error) {
      console.error('❌ Erreur inattendue mise à jour dépense Supabase:', error);
      return false;
    }
  }

  // Supprimer une dépense
  static async deleteExpenseFromSupabase(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erreur suppression dépense Supabase:', error);
        return false;
      }

      console.log('✅ Dépense supprimée dans Supabase:', id);
      return true;
    } catch (error) {
      console.error('❌ Erreur inattendue suppression dépense Supabase:', error);
      return false;
    }
  }
}
