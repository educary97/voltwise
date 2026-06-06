# Integration Guide: Supermarket Benefits & Bill Averaging

## What's Been Added

### 1. **Supermarket Benefit Form**
📁 `lib/components/SupermarketBenefitForm.tsx`

React component that lets users input:
- Where they get cashback (Continente, Pingo Doce, etc)
- Cashback percentage (1-5%)
- Monthly spending estimate
- Shows calculated monthly benefit

### 2. **Bill Averaging**
📁 `lib/utils/averageBills.ts`

Functions to:
- Average multiple electricity bills
- Calculate mean kWh and cost
- Validate bills are from same supplier
- Return single averaged bill for comparison

### 3. **Supabase Seeding**
📁 `lib/scripts/seedPartnerships.ts`

Script to populate Supabase with real partnerships:
- EDP + Pingo Doce (2.5% cashback)
- EDP + Continente (2.0% cashback)
- Endesa + Continente (2.0% cashback)
- Galp + Continente (1.5% cashback)

---

## Next Steps to Complete Integration

### Step 1: Seed Supabase with Partnerships

Run the seeding script to populate your database:

```bash
# In your terminal
npx ts-node lib/scripts/seedPartnerships.ts
```

Or manually in Supabase SQL Editor, run:

```sql
INSERT INTO supermarket_partnerships 
(supplier, supermarket, cashback_percentage, fixed_monthly_eur, effective_date, source_url, created_at, updated_at, expires_at)
VALUES
('EDP', 'Pingo Doce', 2.5, NULL, '2024-01-01', 'https://edp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('EDP', 'Continente', 2.0, NULL, '2024-01-01', 'https://edp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('Endesa', 'Continente', 2.0, NULL, '2024-01-01', 'https://endesa.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('Galp', 'Continente', 1.5, NULL, '2024-01-01', 'https://galp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days');
```

### Step 2: Update page.tsx

Find the bill upload section and add:

```typescript
import { SupermarketBenefitForm, SupermarketBenefitInput } from '@/lib/components/SupermarketBenefitForm';
import { averageBills } from '@/lib/utils/averageBills';

// In your component, add state for supermarket benefit:
const [currentBenefit, setCurrentBenefit] = useState<SupermarketBenefitInput | null>(null);

// When user submits supermarket form:
const handleSupermarketSubmit = (benefit: SupermarketBenefitInput) => {
  setCurrentBenefit(benefit);
  // Then proceed to bill upload or comparison
};

// When averaging bills, use:
const averaged = averageBills(extractedBills);

// Pass benefit to comparison:
const result = await compareToCurrentPlan({
  ...config,
  currentSupermarketBenefit: currentBenefit ? {
    supermarket: currentBenefit.supermarket,
    cashbackPercentage: currentBenefit.cashbackPercentage,
    estimatedMonthlySpending: currentBenefit.monthlySpending,
  } : undefined,
});
```

### Step 3: Update Workflow

New user flow:

1. **User inputs supermarket benefit** → SupermarketBenefitForm
2. **User uploads bills** → Multiple bills accepted
3. **Bills are averaged** → Single averaged bill for comparison
4. **Comparison runs** → Factors in their current supermarket benefit
5. **Results show** → Base cost - supermarket benefit = effective cost

---

## Supermarket Benefits Now Showing?

After integration, offers will display:

```
€78.00 - €15.00 (Pingo Doce 2.5%)
€63.00/mo  ← Effective cost
```

Instead of just:
```
€78.00/mo
```

---

## Testing

### Test Supermarket Form
```typescript
import { SupermarketBenefitForm } from '@/lib/components/SupermarketBenefitForm';

<SupermarketBenefitForm 
  onSubmit={(data) => console.log(data)}
/>
```

### Test Bill Averaging
```typescript
import { averageBills } from '@/lib/utils/averageBills';

const bills = [
  { supplier: 'EDP', monthlyKwh: 350, monthlyCost: 85, extractedDate: '2024-01-01' },
  { supplier: 'EDP', monthlyKwh: 380, monthlyCost: 92, extractedDate: '2024-02-01' },
];

const averaged = averageBills(bills);
console.log(averaged);
// { supplier: 'EDP', monthlyKwh: 365, monthlyCost: 88.5, billCount: 2, ... }
```

---

## Files Modified/Created

- ✅ Created: `lib/components/SupermarketBenefitForm.tsx`
- ✅ Created: `lib/utils/averageBills.ts`
- ✅ Created: `lib/scripts/seedPartnerships.ts`
- 📝 TODO: Update `app/page.tsx` to integrate form and averaging

---

## Support

All components are ready to use. Just:

1. Seed the database
2. Import components into page.tsx
3. Connect them to your bill processing workflow

Once integrated, supermarket benefits will display automatically! 🎉
