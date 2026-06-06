/**
 * Average multiple electricity bills for comparison
 */

export interface BillData {
  supplier: string;
  monthlyKwh: number;
  monthlyCost: number;
  tariffName?: string;
  extractedDate: string;
}

export interface AveragedBill {
  supplier: string;
  monthlyKwh: number;
  monthlyCost: number;
  billCount: number;
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * Average multiple bill extractions
 * Calculates mean kWh and cost across all bills
 */
export function averageBills(bills: BillData[]): AveragedBill {
  if (bills.length === 0) {
    throw new Error('No bills to average');
  }

  // All bills should be from same supplier
  const supplier = bills[0].supplier;
  if (!bills.every(b => b.supplier === supplier)) {
    throw new Error('All bills must be from the same supplier');
  }

  const totalKwh = bills.reduce((sum, b) => sum + b.monthlyKwh, 0);
  const totalCost = bills.reduce((sum, b) => sum + b.monthlyCost, 0);
  
  const avgKwh = totalKwh / bills.length;
  const avgCost = totalCost / bills.length;

  // Sort dates to get range
  const dates = bills.map(b => new Date(b.extractedDate)).sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    from: dates[0].toISOString().split('T')[0],
    to: dates[dates.length - 1].toISOString().split('T')[0],
  };

  return {
    supplier,
    monthlyKwh: Math.round(avgKwh * 100) / 100, // Round to 2 decimals
    monthlyCost: Math.round(avgCost * 100) / 100,
    billCount: bills.length,
    dateRange,
  };
}

/**
 * Check if bills are valid for averaging
 */
export function validateBillsForAveraging(bills: BillData[]): { valid: boolean; error?: string } {
  if (bills.length === 0) {
    return { valid: false, error: 'No bills provided' };
  }

  if (bills.some(b => !b.supplier || b.monthlyKwh <= 0 || b.monthlyCost <= 0)) {
    return { valid: false, error: 'Invalid bill data' };
  }

  const suppliers = new Set(bills.map(b => b.supplier));
  if (suppliers.size > 1) {
    return { valid: false, error: 'All bills must be from the same supplier' };
  }

  return { valid: true };
}
