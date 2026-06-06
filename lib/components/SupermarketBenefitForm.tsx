import React, { useState } from 'react';

export type Supermarket = 'Continente' | 'Pingo Doce' | 'Carrefour' | 'Jumbo' | 'None';

export interface SupermarketBenefitInput {
  supermarket: Supermarket;
}

interface Props {
  onSubmit: (data: SupermarketBenefitInput) => void;
  isLoading?: boolean;
}

export function SupermarketBenefitForm({ onSubmit, isLoading = false }: Props) {
  const [supermarket, setSupermarket] = useState<Supermarket>('None');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ supermarket });
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
        💳 Which supermarket do you shop at?
      </h3>
      
      <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
        We'll show you electricity plans that give you cashback at your supermarket.
      </p>

      <div style={{ marginBottom: 15 }}>
        <select
          value={supermarket}
          onChange={(e) => setSupermarket(e.target.value as Supermarket)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'inherit',
          }}
        >
          <option value="None">None / I don't have a supermarket card</option>
          <option value="Continente">Continente</option>
          <option value="Pingo Doce">Pingo Doce</option>
          <option value="Carrefour">Carrefour</option>
          <option value="Jumbo">Jumbo</option>
        </select>
      </div>

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
        {isLoading ? 'Comparing...' : 'Continue →'}
      </button>
    </form>
  );
}
