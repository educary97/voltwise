import { supabase } from '../supabase';

/**
 * Partnership data from announcements
 */
export interface DetectedPartnership {
  supplier: string;
  supermarket: string;
  cashbackPercentage?: number;
  fixedMonthlyEur?: number;
  effective_date: string;
  source_url: string;
  confidence: number; // 0-1
}

/**
 * Store detected partnership in database
 */
export async function storePartnership(partnership: DetectedPartnership) {
  try {
    const { error } = await supabase
      .from('supermarket_partnerships')
      .upsert({
        supplier: partnership.supplier,
        supermarket: partnership.supermarket,
        cashback_percentage: partnership.cashbackPercentage || null,
        fixed_monthly_eur: partnership.fixedMonthlyEur || null,
        effective_date: partnership.effective_date,
        source_url: partnership.source_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      }, {
        onConflict: 'supplier,supermarket'
      });

    if (error) {
      console.error('Error storing partnership:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in storePartnership:', error);
    return false;
  }
}

/**
 * Get all active partnerships
 */
export async function getActivePartnerships() {
  const { data, error } = await supabase
    .from('supermarket_partnerships')
    .select('*')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching partnerships:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if partnership exists and is still active
 */
export async function isPartnershipActive(supplier: string, supermarket: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('supermarket_partnerships')
    .select('id')
    .eq('supplier', supplier)
    .eq('supermarket', supermarket)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}
