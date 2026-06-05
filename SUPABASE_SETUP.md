# Supabase Setup for Voltwise Phase 2

## Quick Start

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create new project
4. Copy your `Project URL` and `Anon Key`

### 2. Add to .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Create Database Tables

In Supabase SQL Editor, run:

```sql
-- Supermarket Partnerships Table
CREATE TABLE supermarket_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier VARCHAR(50) NOT NULL,
  supermarket VARCHAR(50) NOT NULL,
  cashback_percentage DECIMAL(5,2),
  fixed_monthly_eur DECIMAL(10,2),
  effective_date DATE NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(supplier, supermarket)
);

CREATE INDEX idx_partnerships_supplier ON supermarket_partnerships(supplier);
CREATE INDEX idx_partnerships_expires ON supermarket_partnerships(expires_at);

-- Supplier Offers Table
CREATE TABLE supplier_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier VARCHAR(50) NOT NULL,
  tariff_name VARCHAR(255) NOT NULL,
  direct_url TEXT NOT NULL,
  base_monthly_cost DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(supplier, tariff_name)
);

CREATE INDEX idx_offers_supplier ON supplier_offers(supplier);
CREATE INDEX idx_offers_updated ON supplier_offers(updated_at);
```

### 4. Sample Data (Optional)

```sql
INSERT INTO supermarket_partnerships 
(supplier, supermarket, cashback_percentage, effective_date, source_url, expires_at)
VALUES
('EDP', 'Pingo Doce', 2.5, '2024-01-01', 'https://edp.pt/...', '2026-12-31'),
('Endesa', 'Continente', 2.0, '2024-01-01', 'https://endesa.pt/...', '2026-12-31'),
('Galp', 'Continente', 1.5, '2024-01-01', 'https://galp.pt/...', '2026-12-31');

INSERT INTO supplier_offers
(supplier, tariff_name, direct_url, base_monthly_cost, description)
VALUES
('EDP', 'Mercado Livre 24', 'https://edp.pt/particulares/eletricidade/mercado-livre-24', 78.50, 'Variable rate'),
('EDP', 'Pingo Doce', 'https://edp.pt/particulares/eletricidade/pingo-doce', 78.00, 'Pingo Doce partnership'),
('Endesa', 'Flex Plus', 'https://endesa.pt/particulares/eletricidade/flex-plus', 82.00, 'Flexible plan'),
('Galp', 'Classic Fix', 'https://galp.pt/particulares/eletricidade/classic-fix', 80.00, 'Fixed rate');
```

### 5. Enable Row Level Security (Optional)

For public access (read-only):

```sql
ALTER TABLE supermarket_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON supermarket_partnerships
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON supplier_offers
  FOR SELECT USING (true);
```

## Updating Partnerships

Your news agent can now automatically detect and store partnerships:

```typescript
// In your news agent pipeline:
import { storePartnership } from 'lib/partnerships/monitor';

const partnership = {
  supplier: 'EDP',
  supermarket: 'Pingo Doce',
  cashbackPercentage: 2.5,
  effective_date: '2024-01-01',
  source_url: 'https://...',
  confidence: 0.95
};

await storePartnership(partnership);
```

## Cost

- **Free tier**: 500K API calls/month (more than enough)
- **Paid tier**: $25/month for higher limits
- **No charge** beyond free tier for small projects

## Support

See `lib/supabase.ts` for available functions and usage examples.
