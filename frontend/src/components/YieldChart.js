/**
 * YieldChart — renders the Treasury yield curve as a line chart.
 */

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#111', fontWeight: 600 }}>{payload[0].value?.toFixed(2)}%</div>
    </div>
  );
}

export default function YieldChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="term"
          tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="yield"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
