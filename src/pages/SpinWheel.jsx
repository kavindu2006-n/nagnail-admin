import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

const PRESET_COLORS = ['#FF6B9D','#7C3AED','#22C55E','#F59E0B','#EC4899','#3B82F6','#EF4444','#06B6D4','#84CC16','#F97316','#8B5CF6','#14B8A6','#64748B','#94A3B8'];
const EMOJIS        = ['🎁','💫','🎉','🚚','🔥','💰','👑','🎊','⭐','💎','🌟','🍀','🎯','💯','🎈','🎪','🦄','✨','🏆','😔'];

export default function SpinWheel() {
  const [tab,      setTab]      = useState('prizes');
  const [prizes,   setPrizes]   = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState('');
  const [msgType,  setMsgType]  = useState('success');

  // Prize modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsgType(type); setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  };

  const emptyPrize = {
    label: '', emoji: '🎁', color: '#FF6B9D',
    prize_type: 'coupon', coupon_type: 'percentage',
    coupon_value: 10, min_order: 500,
    probability: 15, display_order: 0, is_active: 1
  };

  useEffect(() => {
    fetchPrizes();
    fetchSettings();
    fetchStats();
  }, []);

  const fetchPrizes = async () => {
    try {
      const res = await API.get('/spin-wheel/prizes');
      if (res.data.success) setPrizes(res.data.prizes);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const res = await API.get('/spin-wheel/settings');
      if (res.data.success) setSettings(res.data.settings);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get('/spin-wheel/stats');
      if (res.data.success) setStats(res.data);
    } catch (e) { console.error(e); }
  };

  // ─── Prize CRUD ────────────────────────────────────────────────────────
  const openNewPrize = () => { setEditing({ ...emptyPrize }); setModalOpen(true); };
  const openEditPrize = (p) => { setEditing({ ...p }); setModalOpen(true); };

  const savePrize = async () => {
    if (!editing.label) return showMsg('Label required', 'error');
    try {
      if (editing.id) {
        await API.put(`/spin-wheel/prizes/${editing.id}`, editing);
        showMsg('✅ Prize updated');
      } else {
        await API.post('/spin-wheel/prizes', editing);
        showMsg('✅ Prize created');
      }
      setModalOpen(false);
      fetchPrizes();
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, 'error');
    }
  };

  const deletePrize = async (id) => {
    if (!confirm('Delete this prize?')) return;
    try {
      await API.delete(`/spin-wheel/prizes/${id}`);
      showMsg('🗑 Prize deleted');
      fetchPrizes();
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, 'error');
    }
  };

  // ─── Settings ──────────────────────────────────────────────────────────
  const saveSettings = async () => {
    try {
      await API.put('/spin-wheel/settings', settings);
      showMsg('✅ Settings saved');
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, 'error');
    }
  };

  const totalProbability = prizes.reduce((s, p) => s + (parseInt(p.probability) || 0), 0);

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ─── Header ──────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #ec4899, #7c3aed, #3b82f6)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#fff',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '160px', opacity: 0.15 }}>🎡</div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>🎡 Spin The Wheel</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
            Boost conversions with a fun prize wheel • Auto-generates unique coupons
          </p>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={pillStyle}>
              {settings?.is_enabled ? '🟢 Wheel ACTIVE' : '🔴 Wheel DISABLED'}
            </div>
            {stats && (
              <>
                <div style={pillStyle}>🎯 {stats.totals.total_spins} spins</div>
                <div style={pillStyle}>📧 {stats.totals.unique_emails} unique emails</div>
                <div style={pillStyle}>🎟️ {stats.totals.coupons_generated} coupons</div>
              </>
            )}
          </div>
        </div>

        {/* ─── Message ─────────────────────────────────────────────────── */}
        {msg && (
          <div style={{
            padding: '12px 18px', borderRadius: '10px', marginBottom: '16px',
            fontWeight: 600, fontSize: '13px',
            background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
            color:      msgType === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>{msg}</div>
        )}

        {/* ─── Tabs ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          {[
            { k: 'prizes',   l: '🎁 Prizes' },
            { k: 'settings', l: '⚙️ Settings' },
            { k: 'stats',    l: '📊 Analytics' }
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              color: tab === t.k ? '#7c3aed' : '#6b7280',
              borderBottom: tab === t.k ? '3px solid #7c3aed' : '3px solid transparent',
              marginBottom: '-1px'
            }}>{t.l}</button>
          ))}
        </div>

        {/* ─── TAB: PRIZES ─────────────────────────────────────────────── */}
        {tab === 'prizes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <strong>{prizes.length} prizes</strong>
                <span style={{
                  marginLeft: 10, padding: '3px 10px',
                  background: totalProbability > 0 ? '#f0fdf4' : '#fef2f2',
                  color:      totalProbability > 0 ? '#16a34a' : '#dc2626',
                  borderRadius: 12, fontSize: 11, fontWeight: 700
                }}>Total weight: {totalProbability}</span>
              </div>
              <button onClick={openNewPrize} style={{
                padding: '10px 20px', border: 'none',
                background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                color: '#fff', borderRadius: '10px',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer'
              }}>+ New Prize</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {prizes.map(p => {
                const winChance = totalProbability > 0 ? (p.probability / totalProbability * 100).toFixed(1) : 0;
                return (
                  <div key={p.id} style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderTop: `4px solid ${p.color}`,
                    opacity: p.is_active ? 1 : 0.55
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: 44, height: 44, background: p.color,
                        borderRadius: 10, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 24
                      }}>{p.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>{p.prize_type}</div>
                      </div>
                      {!p.is_active && (
                        <span style={{ fontSize: 10, padding: '3px 7px', background: '#fef2f2', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>OFF</span>
                      )}
                    </div>

                    {p.prize_type === 'coupon' && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        💰 {p.coupon_type === 'percentage' ? `${p.coupon_value}% off` : `LKR ${p.coupon_value} off`}
                        {p.min_order > 0 && ` • Min ${p.min_order}`}
                      </div>
                    )}

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#6b7280' }}>Win chance</span>
                        <span style={{ fontWeight: 700, color: p.color }}>{winChance}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${winChance}%`, height: '100%', background: p.color }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditPrize(p)} style={btnEdit}>Edit</button>
                      <button onClick={() => deletePrize(p.id)} style={btnDel}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ─── TAB: SETTINGS ───────────────────────────────────────────── */}
        {tab === 'settings' && settings && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Wheel Configuration</h3>

            {/* Enable toggle */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f9fafb', borderRadius: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Wheel Status</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Show spin wheel to customers</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
                <input type="checkbox" checked={!!settings.is_enabled}
                  onChange={e => setSettings({ ...settings, is_enabled: e.target.checked ? 1 : 0 })}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0,
                  background: settings.is_enabled ? '#22c55e' : '#d1d5db',
                  borderRadius: 26, transition: 'all 0.2s'
                }}>
                  <span style={{
                    position: 'absolute', height: 20, width: 20,
                    left: settings.is_enabled ? 26 : 3, top: 3,
                    background: '#fff', borderRadius: '50%', transition: 'all 0.2s'
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={lbl}>Title</label>
                <input value={settings.title || ''} onChange={e => setSettings({ ...settings, title: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Subtitle</label>
                <input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Button Text</label>
                <input value={settings.cta_text || ''} onChange={e => setSettings({ ...settings, cta_text: e.target.value })} style={inp} /></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>Trigger delay (seconds)</label>
                  <input type="number" min={1} value={settings.trigger_delay_sec || 25}
                    onChange={e => setSettings({ ...settings, trigger_delay_sec: +e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Scroll trigger %</label>
                  <input type="number" min={0} max={100} value={settings.trigger_scroll || 60}
                    onChange={e => setSettings({ ...settings, trigger_scroll: +e.target.value })} style={inp} /></div>
              </div>

              <div><label style={lbl}>Cooldown (days between spins per user)</label>
                <input type="number" min={1} value={settings.cooldown_days || 30}
                  onChange={e => setSettings({ ...settings, cooldown_days: +e.target.value })} style={inp} /></div>

              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={!!settings.require_email}
                    onChange={e => setSettings({ ...settings, require_email: e.target.checked ? 1 : 0 })} />
                  Require email
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={!!settings.require_phone}
                    onChange={e => setSettings({ ...settings, require_phone: e.target.checked ? 1 : 0 })} />
                  Require phone
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={!!settings.trigger_exit}
                    onChange={e => setSettings({ ...settings, trigger_exit: e.target.checked ? 1 : 0 })} />
                  Exit-intent trigger
                </label>
              </div>
            </div>

            <button onClick={saveSettings} style={{
              marginTop: 20, padding: '12px 28px', border: 'none',
              background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
              color: '#fff', borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}>💾 Save Settings</button>
          </div>
        )}

        {/* ─── TAB: STATS ──────────────────────────────────────────────── */}
        {tab === 'stats' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { l: 'Total Spins', v: stats.totals.total_spins || 0, c: '#7c3aed', e: '🎯' },
                { l: 'Unique Emails', v: stats.totals.unique_emails || 0, c: '#ec4899', e: '📧' },
                { l: 'Coupons Issued', v: stats.totals.coupons_generated || 0, c: '#22c55e', e: '🎟️' },
                { l: 'Claimed', v: stats.totals.claimed_count || 0, c: '#f59e0b', e: '✅' }
              ].map((s, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${s.c}` }}>
                  <div style={{ fontSize: 22 }}>{s.e}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.c, marginTop: 6 }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
              {/* Prize breakdown */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🏆 Prize Distribution</h4>
                {stats.byPrize.map(p => {
                  const pct = stats.totals.total_spins > 0 ? (p.win_count / stats.totals.total_spins * 100).toFixed(1) : 0;
                  return (
                    <div key={p.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span><span style={{ marginRight: 6 }}>{p.emoji}</span>{p.label}</span>
                        <span style={{ fontWeight: 700 }}>{p.win_count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: p.color || '#7c3aed' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent winners */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>👥 Recent Spins</h4>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {stats.recent.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No spins yet</p>}
                  {stats.recent.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                      <div style={{ fontSize: 18 }}>{r.prize_emoji || '🎁'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#111' }}>{r.email || 'Anonymous'}</div>
                        <div style={{ color: '#6b7280', fontSize: 11 }}>{r.prize_label}</div>
                      </div>
                      <div style={{ textAlign: 'right', color: '#9ca3af', fontSize: 10 }}>
                        {r.coupon_code && <div style={{ color: '#7c3aed', fontWeight: 700 }}>{r.coupon_code}</div>}
                        <div>{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL ───────────────────────────────────────────────────── */}
        {modalOpen && editing && (
          <div onClick={() => setModalOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 16, padding: 24,
              maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto'
            }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700 }}>
                {editing.id ? '✏️ Edit Prize' : '+ New Prize'}
              </h3>

              {/* Preview */}
              <div style={{
                background: editing.color, borderRadius: 12,
                padding: 20, textAlign: 'center', marginBottom: 16
              }}>
                <div style={{ fontSize: 40 }}>{editing.emoji}</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginTop: 4 }}>{editing.label || 'Prize label'}</div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div><label style={lbl}>Label *</label>
                  <input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} style={inp} placeholder="e.g. 10% OFF" /></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Emoji</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {EMOJIS.map(em => (
                        <button key={em} onClick={() => setEditing({ ...editing, emoji: em })} style={{
                          width: 32, height: 32, border: editing.emoji === em ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                          background: '#fff', borderRadius: 6, fontSize: 18, cursor: 'pointer'
                        }}>{em}</button>
                      ))}
                    </div>
                  </div>
                  <div><label style={lbl}>Color</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditing({ ...editing, color: c })} style={{
                          width: 28, height: 28, border: editing.color === c ? '3px solid #111' : '1px solid #e5e7eb',
                          background: c, borderRadius: 6, cursor: 'pointer'
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div><label style={lbl}>Prize Type</label>
                  <select value={editing.prize_type} onChange={e => setEditing({ ...editing, prize_type: e.target.value })} style={inp}>
                    <option value="coupon">🎟️ Coupon Discount</option>
                    <option value="free_shipping">🚚 Free Shipping</option>
                    <option value="no_win">😔 No Win (Try Again)</option>
                    <option value="custom">🎁 Custom</option>
                  </select>
                </div>

                {editing.prize_type === 'coupon' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><label style={lbl}>Discount Type</label>
                      <select value={editing.coupon_type} onChange={e => setEditing({ ...editing, coupon_type: e.target.value })} style={inp}>
                        <option value="percentage">%</option>
                        <option value="fixed">LKR</option>
                      </select>
                    </div>
                    <div><label style={lbl}>Value</label>
                      <input type="number" min={0} value={editing.coupon_value} onChange={e => setEditing({ ...editing, coupon_value: +e.target.value })} style={inp} /></div>
                    <div><label style={lbl}>Min Order</label>
                      <input type="number" min={0} value={editing.min_order} onChange={e => setEditing({ ...editing, min_order: +e.target.value })} style={inp} /></div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Win Weight (higher = more common)</label>
                    <input type="number" min={0} max={100} value={editing.probability} onChange={e => setEditing({ ...editing, probability: +e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>Display Order</label>
                    <input type="number" min={0} value={editing.display_order} onChange={e => setEditing({ ...editing, display_order: +e.target.value })} style={inp} /></div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4 }}>
                  <input type="checkbox" checked={!!editing.is_active}
                    onChange={e => setEditing({ ...editing, is_active: e.target.checked ? 1 : 0 })} />
                  Active (visible on wheel)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setModalOpen(false)} style={{
                  flex: 1, padding: 12, border: '1px solid #e5e7eb',
                  background: '#fff', borderRadius: 10, fontWeight: 600, cursor: 'pointer'
                }}>Cancel</button>
                <button onClick={savePrize} style={{
                  flex: 2, padding: 12, border: 'none',
                  background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                  color: '#fff', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
                }}>💾 Save Prize</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 };
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const pillStyle = { padding: '5px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: 20, fontSize: 12, fontWeight: 600 };
const btnEdit = { flex: 1, padding: 8, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnDel  = { flex: 1, padding: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
