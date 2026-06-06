import React, { useState } from 'react';

export interface SupermarketBenefitInput {
  supermarket: 'Continente' | 'Pingo Doce' | 'Carrefour' | 'Jumbo' | 'None';
  cashbackPercentage: number;
  monthlySpending: number;
}

interface Props {
  onSubmit: (data: SupermarketBenefitInput) => void;
  isLoading?: boolean;
}

export function SupermarketBenefitForm({ onSubmit, isLoading = false }: Props) {
  const [supermarket, setSupermarket] = useState<SupermarketBenefitInput['supermarket']>('None');
  const [cashbackPercentage, setCashbackPercentage] = useState(2.0);
  const [monthlySpending, setMonthlySpending] = useState(600);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (supermarket === 'None') {
      onSubmit({
        supermarket: 'None',
        cashbackPercentage: 0,
        monthlySpending: 0,
      });
    } else {
      onSubmit({
        supermarket,
        cashbackPercentage,
        monthlySpending,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: 16, fontWeight: 600 }}>
        💳 Current Supermarket Benefits
      </h3>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          Where do you get cashback?
        </label>
        <select
          value={supermarket}
          onChange={(e) => setSupermarket(e.target.value as SupermarketBenefitInput['supermarket'])}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'inherit',
          }}
        >
          <option value="None">No current benefit</option>
          <option value="Continente">Continente</option>
          <option value="Pingo Doce">Pingo Doce</option>
          <option value="Carrefour">Carrefour</option>
          <option value="Jumbo">Jumbo</option>
        </select>
      </div>

      {supermarket !== 'None' && (
        <>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Cashback percentage: <strong>{cashbackPercentage}%</strong>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={cashbackPercentage}
              onChange={(e) => setCashbackPercentage(parseFloat(e.target.value))}
              disabled={isLoading}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              Typical: 1-3% for most supermarkets
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Monthly spending at {supermarket}: <strong>€{monthlySpending}</strong>
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={monthlySpending}
              onChange={(e) => setMonthlySpending(parseInt(e.target.value))}
              disabled={isLoading}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              This estimates your monthly cashback benefit
            </div>
          </div>

          <div style={{
            background: '#f0f8f0',
            padding: '12px',
            borderRadius: '4px',
            fontSize: 13,
            color: '#2d6a2d',
            marginBottom: 15
          }}>
            💰 Monthly benefit: €{(monthlySpending * cashbackPercentage / 100).toFixed(2)}
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          background: '#6abf69',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: 14,
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Comparing...' : 'Compare Plans'}
      </button>
    </form>
  );
}
