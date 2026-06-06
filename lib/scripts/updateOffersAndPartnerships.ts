import { supabase } from "../supabase";

/**
 * Fetch current offers from ERSE and detect partnerships
 * Runs daily via GitHub Actions
 */

interface ERSEOffer {
  supplier: string;
  tariffName: string;
  directUrl: string;
  monthlyCost: number;
  description: string;
}

/**
 * Mock ERSE data - In production, call actual ERSE API
 */
function getMockERSEOffers(): ERSEOffer[] {
  return [
    {
      supplier: "EDP",
      tariffName: "Mercado Livre 24",
      directUrl: "https://edp.pt/particulares/eletricidade/mercado-livre-24",
      monthlyCost: 78.50,
      description: "Variable rate electricity",
    },
    {
      supplier: "EDP",
      tariffName: "Pingo Doce",
      directUrl: "https://edp.pt/particulares/eletricidade/pingo-doce",
      monthlyCost: 77.00,
      description: "EDP + Pingo Doce partnership - 2.5% cashback",
    },
    {
      supplier: "Endesa",
      tariffName: "Flex Plus",
      directUrl: "https://endesa.pt/particulares/eletricidade/flex-plus",
      monthlyCost: 82.00,
      description: "Flexible plan with Continente 2% cashback",
    },
    {
      supplier: "Galp",
      tariffName: "Classic Fix",
      directUrl: "https://galp.pt/particulares/eletricidade/classic-fix",
      monthlyCost: 80.00,
      description: "Fixed rate - Continente 1.5% cashback",
    },
  ];
}

/**
 * Detect partnerships from offer description
 */
function detectPartnership(
  supplier: string,
  description: string
): { supermarket: string; cashbackPercentage: number } | null {
  const partnerships = [
    { pattern: /pingo doce.*(\d+\.?\d*)%/i, supermarket: "Pingo Doce" },
    { pattern: /continente.*(\d+\.?\d*)%/i, supermarket: "Continente" },
    { pattern: /carrefour.*(\d+\.?\d*)%/i, supermarket: "Carrefour" },
  ];

  for (const { pattern, supermarket } of partnerships) {
    const match = description.match(pattern);
    if (match) {
      return {
        supermarket,
        cashbackPercentage: parseFloat(match[1] || "0"),
      };
    }
  }

  return null;
}

/**
 * Update offers table
 */
async function updateOffers(offers: ERSEOffer[]) {
  console.log(`Updating ${offers.length} offers...`);

  for (const offer of offers) {
    const { error } = await supabase.from("supplier_offers").upsert(
      {
        supplier: offer.supplier,
        tariff_name: offer.tariffName,
        direct_url: offer.directUrl,
        base_monthly_cost: offer.monthlyCost,
        description: offer.description,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "supplier,tariff_name",
      }
    );

    if (error) {
      console.error(`Error updating ${offer.supplier} ${offer.tariffName}:`, error);
    } else {
      console.log(`✓ Updated: ${offer.supplier} - ${offer.tariffName}`);
    }
  }
}

/**
 * Update partnerships table
 */
async function updatePartnerships(offers: ERSEOffer[]) {
  console.log("Detecting partnerships...");

  for (const offer of offers) {
    const partnership = detectPartnership(offer.supplier, offer.description);

    if (partnership) {
      const { error } = await supabase
        .from("supermarket_partnerships")
        .upsert(
          {
            supplier: offer.supplier,
            supermarket: partnership.supermarket,
            cashback_percentage: partnership.cashbackPercentage,
            fixed_monthly_eur: null,
            effective_date: new Date().toISOString().split("T")[0],
            source_url: offer.directUrl,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "supplier,supermarket",
          }
        );

      if (error) {
        console.error(
          `Error updating partnership ${offer.supplier} + ${partnership.supermarket}:`,
          error
        );
      } else {
        console.log(
          `✓ Partnership: ${offer.supplier} + ${partnership.supermarket} (${partnership.cashbackPercentage}%)`
        );
      }
    }
  }
}

/**
 * Main execution
 */
export async function updateERSEData() {
  console.log("Starting ERSE offers & partnerships update...");

  try {
    const offers = getMockERSEOffers();

    await updateOffers(offers);
    await updatePartnerships(offers);

    console.log("✓ Update complete!");
    return { success: true, message: "ERSE data updated successfully" };
  } catch (error) {
    console.error("Error during update:", error);
    return { success: false, error: String(error) };
  }
}

// Run if called directly
if (require.main === module) {
  updateERSEData().then((result) => {
    console.log(result);
    process.exit(result.success ? 0 : 1);
  });
}
