import { supabase, SupplierOfferDB, getSupplierPartnership } from '../supabase';

/**
 * Find user's current offer from database
 * Strategy: Match by supplier + tariff name
 */
export async function findUserCurrentOffer(
  supplier: string,
  tariffName: string
): Promise<SupplierOfferDB | null> {
  try {
    const { data, error } = await supabase
      .from('supplier_offers')
      .select('*')
      .eq('supplier', supplier)
      .ilike('tariff_name', `%${tariffName}%`)
      .limit(1)
      .single();

    if (error) {
      console.warn(`Could not find exact match for ${supplier} ${tariffName}`);
      // Fallback: return first offer from supplier
      const { data: fallback } = await supabase
        .from('supplier_offers')
        .select('*')
        .eq('supplier', supplier)
        .limit(1)
        .single();
      return fallback || null;
    }

    return data;
  } catch (error) {
    console.error('Error finding user offer:', error);
    return null;
  }
}

/**
 * Enrich offer with supermarket partnership data
 */
export async function enrichOfferWithBenefit(offer: SupplierOfferDB, monthlySpending: number) {
  const partnership = await getSupplierPartnership(offer.supplier);

  if (!partnership) {
    return {
      ...offer,
      supermarketBenefit: undefined,
      estimatedMonthlyBenefit: 0,
      estimatedMonthlyEurAfterBenefit: offer.base_monthly_cost,
    };
  }

  let benefit = 0;
  if (partnership.fixed_monthly_eur) {
    benefit = partnership.fixed_monthly_eur;
  } else if (partnership.cashback_percentage) {
    benefit = (monthlySpending * partnership.cashback_percentage) / 100;
  }

  return {
    ...offer,
    supermarketBenefit: {
      supermarket: partnership.supermarket,
      cashbackPercentage: partnership.cashback_percentage,
      fixedMonthlyEur: partnership.fixed_monthly_eur,
    },
    estimatedMonthlyBenefit: benefit,
    estimatedMonthlyEurAfterBenefit: Math.max(0, offer.base_monthly_cost - benefit),
  };
}

/**
 * Get all offers enriched with partnership data
 */
export async function getAllOffersEnriched(monthlySpending: number) {
  const { data: offers, error } = await supabase
    .from('supplier_offers')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !offers) {
    return [];
  }

  const enriched = await Promise.all(
    offers.map(offer => enrichOfferWithBenefit(offer, monthlySpending))
  );

  return enriched.sort((a, b) => 
    (a.estimatedMonthlyEurAfterBenefit || a.base_monthly_cost) - 
    (b.estimatedMonthlyEurAfterBenefit || b.base_monthly_cost)
  );
}
