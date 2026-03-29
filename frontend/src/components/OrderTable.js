/**
 * OrderTable — displays historical order submissions.
 */

import React from 'react';
import { formatCurrency, formatDate } from '../utils';

const td = { padding: '11px 12px', color: '#374151', verticalAlign: 'middle' };

function OrderRow({ order, onDelete }) {
  return (
    <tr style={{ borderBottom: '1px solid #f9fafb' }}>
      <td style={td}>
        <span style={{
          background: '#eff6ff',
          color: '#2563eb',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {order.term}
        </span>
      </td>
      <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>
        {formatCurrency(order.amount)}
      </td>
      <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace", color: '#059669' }}>
        {order.yield_rate != null ? `${order.yield_rate.toFixed(2)}%` : '—'}
      </td>
      <td style={{ ...td, color: '#9ca3af' }}>{formatDate(order.submitted_at)}</td>
      <td style={{ ...td, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.notes || '—'}
      </td>
      <td style={td}>
        <button
          onClick={() => onDelete(order.id)}
          style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

export default function OrderTable({ orders, onDelete }) {
  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
        No orders yet. Submit one above.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            {['Term', 'Amount', 'Yield', 'Submitted', 'Notes', ''].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: 500, fontSize: 11 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
