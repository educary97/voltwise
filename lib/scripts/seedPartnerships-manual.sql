-- Copy and paste this into Supabase SQL Editor
INSERT INTO supermarket_partnerships 
(supplier, supermarket, cashback_percentage, fixed_monthly_eur, effective_date, source_url, created_at, updated_at, expires_at)
VALUES
('EDP', 'Pingo Doce', 2.5, NULL, '2024-01-01', 'https://edp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('EDP', 'Continente', 2.0, NULL, '2024-01-01', 'https://edp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('Endesa', 'Continente', 2.0, NULL, '2024-01-01', 'https://endesa.pt', NOW(), NOW(), NOW() + INTERVAL '365 days'),
('Galp', 'Continente', 1.5, NULL, '2024-01-01', 'https://galp.pt', NOW(), NOW(), NOW() + INTERVAL '365 days');
