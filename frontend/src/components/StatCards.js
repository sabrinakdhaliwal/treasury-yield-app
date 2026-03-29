/**
 * StatCards — summary stats: total orders and total capital deployed.
 */

import React from 'react';
import { formatCurrency } from '../utils';

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '14px 16px',
};

export default function StatCards({ orders }) {
  const totalDeployed = orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={card}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Total orders</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: '#111' }}>{orders.length}</div>
      </div>
      <div style={card}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Deployed</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2563eb', marginTop: 4 }}>
          {formatCurrency(totalDeployed)}
        </div>
      </div>
    </div>
  );
}
