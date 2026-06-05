import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supermarket Partnership Interface
 */
export interface SupermarketPartnership {
  id: string;
  supplier: string;
  supermarket: string;
  cashback_percentage: number | null;
  fixed_monthly_eur: number | null;
  effective_date: string;
  source_url: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Supplier Offer Interface
 */
export interface SupplierOfferDB {
  id: string;
  supplier: string;
  tariff_name: string;
  direct_url: string;
  base_monthly_cost: number;
  description: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch active supermarket partnerships
 */
export async function getActivePartnerships(): Promise<SupermarketPartnership[]> {
  const { data, error } = await supabase
    .from('supermarket_partnerships')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching partnerships:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch partnership for specific supplier
 */
export async function getSupplierPartnership(supplier: string): Promise<SupermarketPartnership | null> {
  const { data, error } = await supabase
    .from('supermarket_partnerships')
    .select('*')
    .eq('supplier', supplier)
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Fetch all current offers from database
 */
export async function getCurrentOffers(): Promise<SupplierOfferDB[]> {
  const { data, error } = await supabase
    .from('supplier_offers')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching offers:', error);
    return [];
  }

  return data || [];
}

/**
 * Find offer by supplier and tariff name
 */
export async function findOffer(supplier: string, tariffName: string): Promise<SupplierOfferDB | null> {
  const { data, error } = await supabase
    .from('supplier_offers')
    .select('*')
    .eq('supplier', supplier)
    .ilike('tariff_name', `%${tariffName}%`)
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}
