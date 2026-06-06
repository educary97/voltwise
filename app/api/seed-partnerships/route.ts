import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const partnerships = [
      {
        supplier: 'EDP',
        supermarket: 'Pingo Doce',
        cashback_percentage: 2.5,
        fixed_monthly_eur: null,
        effective_date: '2024-01-01',
        source_url: 'https://edp.pt/particulares/eletricidade/pingo-doce',
      },
      {
        supplier: 'EDP',
        supermarket: 'Continente',
        cashback_percentage: 2.0,
        fixed_monthly_eur: null,
        effective_date: '2024-01-01',
        source_url: 'https://edp.pt/particulares/eletricidade/continente',
      },
      {
        supplier: 'Endesa',
        supermarket: 'Continente',
        cashback_percentage: 2.0,
        fixed_monthly_eur: null,
        effective_date: '2024-01-01',
        source_url: 'https://endesa.pt/particulares/eletricidade',
      },
      {
        supplier: 'Galp',
        supermarket: 'Continente',
        cashback_percentage: 1.5,
        fixed_monthly_eur: null,
        effective_date: '2024-01-01',
        source_url: 'https://galp.pt/particulares/eletricidade',
      },
    ];

    let seeded = 0;
    for (const partnership of partnerships) {
      const { error } = await supabase
        .from('supermarket_partnerships')
        .upsert(
          {
            ...partnership,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            onConflict: 'supplier,supermarket',
          }
        );

      if (!error) seeded++;
    }

    return Response.json({
      success: true,
      message: `✓ Seeded ${seeded}/${partnerships.length} partnerships`,
      seeded,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
