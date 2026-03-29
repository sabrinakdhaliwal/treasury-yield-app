/**
 * Header — app title, data source badge, and date.
 */

import React from 'react';

export default function Header({ source, asOf }) {
  const badgeStyle = {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    background: source === 'static' ? '#fef3c7' : '#dcfce7',
    color: source === 'static' ? '#92400e' : '#166534',
  };

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>Treasury Desk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9ca3af' }}>
          {asOf && <span>as of {asOf}</span>}
          {source && <span style={badgeStyle}>{source}</span>}
        </div>
      </div>
    </div>
  );
}
