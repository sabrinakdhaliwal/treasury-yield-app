/**
 * KeyRates — displays benchmark yields for 3Mo, 2Yr, 10Yr, 30Yr.
 */

import React from 'react';

const BENCHMARKS = ['3 Mo', '2 Yr', '10 Yr', '30 Yr'];

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '14px 16px',
};

export default function KeyRates({ curve }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
      {BENCHMARKS.map((term) => {
        const entry = curve.find((c) => c.term === term);
        return (
          <div key={term} style={card}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              {term}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#111', fontFamily: "'IBM Plex Mono', monospace" }}>
              {entry ? `${entry.yield.toFixed(2)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
