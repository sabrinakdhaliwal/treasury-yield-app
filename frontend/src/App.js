import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

const API = process.env.REACT_APP_API_URL || '';

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0a0f1e',
        border: '1px solid #2a3550',
        padding: '12px 16px',
        borderRadius: '4px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        <div style={{ color: '#8899bb', fontSize: '11px', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'DM Mono, monospace' }}>
          {label}
        </div>
        <div style={{ color: '#e8f4ff', fontSize: '22px', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
          {payload[0].value?.toFixed(2)}%
        </div>
      </div>
    );
  }
  return null;
};

// ─── Order Row ────────────────────────────────────────────────────────────────
const OrderRow = ({ order, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Remove this order?')) return;
    setDeleting(true);
    await onDelete(order.id);
  };

  return (
    <tr style={{ borderBottom: '1px solid #111827' }}>
      <td style={tdStyle}><span style={termBadge}>{order.term}</span></td>
      <td style={{ ...tdStyle, fontFamily: 'DM Mono, monospace', color: '#c8e0ff' }}>{fmt(order.amount)}</td>
      <td style={{ ...tdStyle, fontFamily: 'DM Mono, monospace', color: '#4ecdc4' }}>
        {order.yield_rate != null ? `${order.yield_rate.toFixed(2)}%` : '—'}
      </td>
      <td style={{ ...tdStyle, color: '#556', fontSize: '12px', fontFamily: 'DM Mono, monospace' }}>{fmtDate(order.submitted_at)}</td>
      <td style={{ ...tdStyle, color: '#667', fontSize: '12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.notes || '—'}</td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <button onClick={handleDelete} disabled={deleting} style={deleteBtnStyle}>
          {deleting ? '…' : '✕'}
        </button>
      </td>
    </tr>
  );
};

const tdStyle = { padding: '12px 16px', color: '#aab8cc', verticalAlign: 'middle' };
const termBadge = {
  background: '#0d2040',
  border: '1px solid #1e3a5f',
  color: '#7ab4ff',
  padding: '3px 10px',
  borderRadius: '3px',
  fontFamily: 'DM Mono, monospace',
  fontSize: '12px',
  letterSpacing: '0.05em',
  fontWeight: 500,
};
const deleteBtnStyle = {
  background: 'transparent',
  border: '1px solid #2a1f1f',
  color: '#664',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '3px',
  fontSize: '12px',
  transition: 'all 0.15s',
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [yields, setYields] = useState({ curve: [], source: '', as_of: '', valid_terms: [] });
  const [orders, setOrders] = useState([]);
  const [loadingYields, setLoadingYields] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [form, setForm] = useState({ term: '', amount: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('curve'); // 'curve' | 'orders'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadYields = useCallback(async () => {
    setLoadingYields(true);
    try {
      const res = await fetch(`${API}/api/yields`);
      const data = await res.json();
      setYields(data);
      if (data.valid_terms?.length && !form.term) {
        setForm(f => ({ ...f, term: data.valid_terms.find(t => t === '10 Yr') || data.valid_terms[0] }));
      }
    } catch {
      showToast('Failed to load yield data', 'error');
    } finally {
      setLoadingYields(false);
    }
  }, []); // eslint-disable-line

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => { loadYields(); loadOrders(); }, [loadYields, loadOrders]);

  const handleSubmit = async () => {
    if (!form.term || !form.amount || Number(form.amount) <= 0) {
      showToast('Enter a valid term and amount', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: form.term, amount: Number(form.amount), notes: form.notes || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error submitting order');
      }
      const newOrder = await res.json();
      setOrders(prev => [newOrder, ...prev]);
      setForm(f => ({ ...f, amount: '', notes: '' }));
      showToast(`Order submitted — ${form.term} @ ${newOrder.yield_rate?.toFixed(2)}%`);
      setActiveTab('orders');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/orders/${id}`, { method: 'DELETE' });
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // Find the selected term's yield for preview
  const selectedYield = yields.curve.find(c => c.term === form.term)?.yield;
  const totalInterest = selectedYield && form.amount
    ? (Number(form.amount) * selectedYield / 100).toFixed(2)
    : null;

  // Detect inversion for annotation
  const curve2y = yields.curve.find(c => c.term === '2 Yr')?.yield;
  const curve10y = yields.curve.find(c => c.term === '10 Yr')?.yield;
  const isInverted = curve2y && curve10y && curve2y > curve10y;

  return (
    <div style={appStyle}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 1000,
          background: toast.type === 'error' ? '#1a0f0f' : '#0a1a10',
          border: `1px solid ${toast.type === 'error' ? '#5c2222' : '#1a4a2a'}`,
          color: toast.type === 'error' ? '#ff8a8a' : '#4ecdc4',
          padding: '12px 20px', borderRadius: '4px',
          fontFamily: 'DM Mono, monospace', fontSize: '13px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <h1 style={h1Style}>TREASURY YIELD APP</h1>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#3a5070', letterSpacing: '0.1em' }}>
            LIQUIDITY MANAGEMENT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {yields.as_of && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#3a5070' }}>
              AS OF {yields.as_of.toUpperCase()}
            </span>
          )}
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: '10px',
            color: yields.source === 'live' ? '#4ecdc4' : yields.source === 'fred' ? '#7ab4ff' : '#8855aa',
            background: yields.source === 'live' ? '#0a1a18' : yields.source === 'fred' ? '#0a1020' : '#150a20',
            border: `1px solid ${yields.source === 'live' ? '#1a4a40' : yields.source === 'fred' ? '#1a2a50' : '#2a1a40'}`,
            padding: '3px 8px', borderRadius: '3px', letterSpacing: '0.05em',
          }}>
            {yields.source === 'live' ? '● LIVE' : yields.source === 'fred' ? '● FRED' : '◌ STATIC'}
          </span>
          <button onClick={() => { loadYields(); loadOrders(); }} style={refreshBtnStyle}>↻ REFRESH</button>
        </div>
      </header>

      <div style={mainGrid}>
        {/* LEFT: Yield Curve */}
        <section style={cardStyle}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>U.S. TREASURY YIELD CURVE</span>
            {isInverted && (
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#ff8844', background: '#1a0f00', border: '1px solid #4a2200', padding: '2px 8px', borderRadius: '3px', letterSpacing: '0.05em' }}>
                ⚠ INVERTED
              </span>
            )}
          </div>

          {loadingYields ? (
            <div style={loadingStyle}>Loading yield data…</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={yields.curve} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3a7bd5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3a7bd5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d1829" vertical={false} />
                <XAxis
                  dataKey="term"
                  tick={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fill: '#4a6080' }}
                  axisLine={{ stroke: '#0d1829' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fill: '#4a6080' }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="#3a7bd5"
                  strokeWidth={2}
                  fill="url(#yieldGrad)"
                  dot={{ r: 3, fill: '#3a7bd5', stroke: '#0a0f1e', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#7ab4ff', stroke: '#0a0f1e', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Key rates row */}
          {!loadingYields && (
            <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #0d1829', marginTop: 8 }}>
              {['3 Mo', '2 Yr', '10 Yr', '30 Yr'].map((term) => {
                const entry = yields.curve.find(c => c.term === term);
                return (
                  <div key={term} style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid #0d1829' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a5070', letterSpacing: '0.1em', marginBottom: 4 }}>{term}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '20px', color: '#e8f4ff', fontWeight: 400 }}>
                      {entry ? `${entry.yield.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT: Order panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Order form */}
          <section style={cardStyle}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>SUBMIT ORDER</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              <div>
                <label style={labelStyle}>TERM</label>
                <select
                  value={form.term}
                  onChange={(e) => setForm(f => ({ ...f, term: e.target.value }))}
                  style={selectStyle}
                >
                  {(yields.valid_terms.length ? yields.valid_terms : ['10 Yr']).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>AMOUNT (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="100000"
                  placeholder="e.g. 5000000"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={inputStyle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <div>
                <label style={labelStyle}>NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Q2 liquidity buffer"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={inputStyle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Preview */}
              {selectedYield && form.amount && Number(form.amount) > 0 && (
                <div style={{ background: '#050d1a', border: '1px solid #0d2040', borderRadius: '4px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#3a5070' }}>CURRENT YIELD</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: '#4ecdc4' }}>{selectedYield.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#3a5070' }}>EST. ANNUAL INCOME</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: '#7ab4ff' }}>{fmt(totalInterest)}</span>
                  </div>
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting} style={submitBtnStyle}>
                {submitting ? 'SUBMITTING…' : 'SUBMIT ORDER'}
              </button>
            </div>
          </section>

          {/* Quick stats */}
          <section style={{ ...cardStyle, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a5070', letterSpacing: '0.1em', marginBottom: 4 }}>TOTAL ORDERS</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: '#e8f4ff' }}>{orders.length}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a5070', letterSpacing: '0.1em', marginBottom: 4 }}>TOTAL DEPLOYED</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '20px', color: '#7ab4ff' }}>
                  {fmt(orders.reduce((s, o) => s + o.amount, 0))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Order History */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>ORDER HISTORY</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#3a5070' }}>{orders.length} RECORDS</span>
        </div>

        {loadingOrders ? (
          <div style={loadingStyle}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ ...loadingStyle, color: '#2a3a50' }}>No orders submitted yet. Use the form above to place your first order.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #0d1829' }}>
                  {['TERM', 'AMOUNT', 'YIELD', 'SUBMITTED', 'NOTES', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#3a5070', letterSpacing: '0.1em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => <OrderRow key={o.id} order={o} onDelete={handleDelete} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #050a14; }
        input:focus, select:focus { outline: none; border-color: #1e3a5f !important; box-shadow: 0 0 0 2px rgba(58,123,213,0.15); }
        input::placeholder { color: #2a3a50; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        tr:hover td { background: rgba(58,123,213,0.04); }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const appStyle = {
  minHeight: '100vh',
  background: '#050a14',
  color: '#c8d8f0',
  padding: '0 0 40px',
  fontFamily: 'Playfair Display, serif',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 32px',
  borderBottom: '1px solid #0a1525',
  background: '#060c18',
};

const h1Style = {
  margin: 0,
  fontFamily: 'DM Mono, monospace',
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.2em',
  color: '#c8d8f0',
};

const mainGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 360px',
  gap: 16,
  padding: '20px 32px 0',
};

const cardStyle = {
  background: '#070d1c',
  border: '1px solid #0d1829',
  borderRadius: '6px',
  padding: '20px',
  overflow: 'hidden',
};

const sectionHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingBottom: 14,
  borderBottom: '1px solid #0d1829',
};

const sectionTitle = {
  fontFamily: 'DM Mono, monospace',
  fontSize: '11px',
  letterSpacing: '0.15em',
  color: '#4a6080',
  fontWeight: 500,
};

const labelStyle = {
  display: 'block',
  fontFamily: 'DM Mono, monospace',
  fontSize: '10px',
  letterSpacing: '0.12em',
  color: '#3a5070',
  marginBottom: 6,
  fontWeight: 500,
};

const inputStyle = {
  width: '100%',
  background: '#060c18',
  border: '1px solid #0d1829',
  borderRadius: '4px',
  color: '#c8d8f0',
  fontFamily: 'DM Mono, monospace',
  fontSize: '14px',
  padding: '10px 12px',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234a6080'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

const submitBtnStyle = {
  width: '100%',
  background: 'linear-gradient(135deg, #1a3a6a, #0d2040)',
  border: '1px solid #2a4a7a',
  borderRadius: '4px',
  color: '#7ab4ff',
  fontFamily: 'DM Mono, monospace',
  fontSize: '12px',
  letterSpacing: '0.15em',
  fontWeight: 500,
  padding: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginTop: 4,
};

const refreshBtnStyle = {
  background: 'transparent',
  border: '1px solid #0d1829',
  color: '#3a5070',
  fontFamily: 'DM Mono, monospace',
  fontSize: '10px',
  letterSpacing: '0.1em',
  padding: '5px 12px',
  borderRadius: '3px',
  cursor: 'pointer',
};

const loadingStyle = {
  fontFamily: 'DM Mono, monospace',
  fontSize: '13px',
  color: '#2a3a50',
  textAlign: 'center',
  padding: '40px',
};
