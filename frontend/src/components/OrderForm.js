/**
 * OrderForm — term selector, amount input, notes, and income preview.
 */

import React, { useState } from 'react';
import { formatCurrency } from '../utils';

const inputStyle = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  color: '#111',
  fontFamily: "'IBM Plex Sans', sans-serif",
  background: '#fff',
  appearance: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 5,
};

export default function OrderForm({ validTerms, curve, onSubmit }) {
  const [form, setForm] = useState({ term: validTerms[0] || '10 Yr', amount: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedYield = curve.find((c) => c.term === form.term)?.yield;
  const annualIncome =
    selectedYield && form.amount > 0 ? Number(form.amount) * selectedYield / 100 : null;

  const handleSubmit = async () => {
    setError('');
    if (!form.term || !form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid term and amount.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm((f) => ({ ...f, amount: '', notes: '' }));
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#111' }}>Place Order</h3>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Term</label>
          <select
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            style={inputStyle}
          >
            {validTerms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Amount (USD)</label>
          <input
            type="number"
            min="0"
            placeholder="5000000"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Notes</label>
          <input
            type="text"
            placeholder="e.g. Q2 liquidity buffer"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        </div>

        {annualIncome !== null && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#6b7280' }}>Current yield</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#111', fontWeight: 500 }}>
                {selectedYield?.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Est. annual income</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2563eb', fontWeight: 500 }}>
                {formatCurrency(annualIncome)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: submitting ? '#93c5fd' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
    </div>
  );
}
