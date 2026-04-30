import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyChartToClipboard } from '../utils/chartExport';

interface ChartWrapperProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ id, title, subtitle, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyChartToClipboard(id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--fg-base)' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{subtitle}</p>}
        </div>
        <button 
          onClick={handleCopy}
          className={`btn ${copied ? 'btn-success' : 'btn-secondary'}`}
          style={{ padding: '0.4rem', borderRadius: ' var(--radius-sm)' }}
          title="Copy chart to clipboard"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div id={id} style={{ height: '300px', width: '100%', padding: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
};
