/**
 * App — root component. Manages shared state and composes layout.
 * Data fetching lives in api.js, UI components in components/.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { fetchYields, fetchOrders, createOrder, deleteOrder } from './api';
import Header from './components/Header';
import YieldChart from './components/YieldChart';
import KeyRates from './components/KeyRates';
import OrderForm from './components/OrderForm';
import OrderTable from './components/OrderTable';
import StatCards from './components/StatCards';

export default function App() {
  const [yields, setYields] = useState({ curve: [], source: '', as_of: '', valid_terms: [] });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [yieldsData, ordersData] = await Promise.all([fetchYields(), fetchOrders()]);
      setYields(yieldsData);
      setOrders(ordersData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (form) => {
    const order = await createOrder(form);
    setOrders((prev) => [order, ...prev]);
    setSuccess(`Order placed — ${form.term} at ${order.yield_rate?.toFixed(2)}%`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    await deleteOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const curve2y = yields.curve.find((c) => c.term === '2 Yr')?.yield;
  const curve10y = yields.curve.find((c) => c.term === '10 Yr')?.yield;
  const inverted = curve2y && curve10y && curve2y > curve10y;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Header source={yields.source} asOf={yields.as_of} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px' }}>

        {/* Alerts */}
        {inverted && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#9a3412', display: 'flex', gap: 8 }}>
            <span>⚠</span>
            <span>Yield curve is inverted — 2Y ({curve2y?.toFixed(2)}%) exceeds 10Y ({curve10y?.toFixed(2)}%). Historically associated with recession risk.</span>
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#15803d' }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* Left: chart + key rates */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111' }}>U.S. Treasury Yield Curve</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Daily constant maturity rates across all tenors</p>
              </div>
              <YieldChart data={yields.curve} loading={loading} />
            </div>
            {!loading && <KeyRates curve={yields.curve} />}
          </div>

          {/* Right: order form + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <OrderForm
              validTerms={yields.valid_terms}
              curve={yields.curve}
              onSubmit={handleSubmit}
            />
            <StatCards orders={orders} />
          </div>
        </div>

        {/* Order history */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginTop: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#111' }}>
            Order History
            <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 8, fontSize: 13 }}>({orders.length})</span>
          </h3>
          <OrderTable orders={orders} onDelete={handleDelete} />
        </div>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#d1d5db' }}>
          For illustrative purposes only — not financial advice
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, select:focus { outline: 2px solid #bfdbfe; outline-offset: 0; border-color: #93c5fd; }
        input::placeholder { color: #d1d5db; }
        tr:hover td { background: #fafafa; }
        button:hover:not(:disabled) { opacity: 0.9; }
      `}</style>
    </div>
  );
}
