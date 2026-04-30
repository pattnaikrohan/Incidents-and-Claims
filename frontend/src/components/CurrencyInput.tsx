import React, { useState, useEffect } from 'react';
import { CURRENCIES, SHORT_MAPPINGS } from '../constants/currencies';

interface Props {
  label: string;
  value: string; // The combined string e.g. "AUD 12500"
  onChange: (val: string) => void;
  req?: boolean;
}

export const CurrencyInput = ({ label, value, onChange, req }: Props) => {
  // Parse initial value
  const initialCurrency = value.split(' ')[0] || 'AUD';
  const initialAmount = value.split(' ').slice(1).join(' ') || '';

  const [currency, setCurrency] = useState(initialCurrency);
  const [amount, setAmount] = useState(initialAmount);
  const [typedCurrency, setTypedCurrency] = useState(initialCurrency);

  // Sync state back to parent
  useEffect(() => {
    onChange(`${currency} ${amount}`.trim());
  }, [currency, amount]);

  const handleCurrencyType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTypedCurrency(val);
    
    // Auto-complete AU -> AUD
    if (SHORT_MAPPINGS[val]) {
      setCurrency(SHORT_MAPPINGS[val]);
      setTypedCurrency(SHORT_MAPPINGS[val]);
    } else if (CURRENCIES.find(c => c.code === val)) {
      setCurrency(val);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label className="overline">{label}{req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="input-field"
            list="currency-list"
            value={typedCurrency}
            onChange={handleCurrencyType}
            onBlur={() => setTypedCurrency(currency)}
            placeholder="Code"
            style={{ textAlign: 'center', fontWeight: 700 }}
          />
          <datalist id="currency-list">
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </datalist>
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          required={req}
        />
      </div>
    </div>
  );
};
