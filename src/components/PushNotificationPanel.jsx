import React, { useState } from 'react';
import { Package, 
  Bell, BellOff, BellRing, Send, Users,
  Loader2, CheckCircle, XCircle, Zap
} from 'lucide-react';
import { useAdminPush } from '../hooks/useAdminPush';

export default function PushNotificationPanel() {
  const {
    isSupported, isSubscribed, isLoading,
    permission, stats, error,
    subscribe, unsubscribe, sendTest, broadcast
  } = useAdminPush();

  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body:  '',
    url:   'https://nagnail.lk'
  });
  const [isSending,   setIsSending]   = useState(false);
  const [sendResult,  setSendResult]  = useState(null);
  const [isTesting,   setIsTesting]   = useState(false);
  const [testResult,  setTestResult]  = useState(null);

  // ── Quick notification presets ───────────────────────────────────────────────
  const presets = [
    {
      label: '🔥 Flash Sale',
      title: '🔥 Flash Sale — 24 Hours Only!',
      body:  'Get up to 40% off on all nail products. Limited time!',
      url:   'https://nagnail.lk/products'
    },
    {
      label: '🆕 New Arrivals',
      title: '✨ New Arrivals Just Landed!',
      body:  'Fresh nail styles are here. Be the first to grab them!',
      url:   'https://nagnail.lk/products?filter=new'
    },
    {
      label: '🚚 Free Shipping',
      title: '🚚 Free Shipping Today!',
      body:  'Orders over Rs. 1,500 ship FREE island-wide. Order now!',
      url:   'https://nagnail.lk'
    },
    {
      label: '💅 Restock Alert',
      title: '💅 Back in Stock!',
      body:  'Your favourite nail sets are available again. Get yours!',
      url:   'https://nagnail.lk/products'
    }
  ];

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const ok = await sendTest();
    setTestResult(ok ? 'success' : 'error');
    setIsTesting(false);
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.body) return;
    setIsSending(true);
    setSendResult(null);

    const result = await broadcast({
      title: broadcastForm.title,
      body:  broadcastForm.body,
      data:  { url: broadcastForm.url }
    });

    setSendResult(result);
    setIsSending(false);
    if (result && result.sent > 0) {
      setBroadcastForm({ title: '', body: '', url: 'https://nagnail.lk' });
    }
  };

  if (!isSupported) {
    return (
      <div className="pp-unsupported">
        <BellOff size={24} />
        <p>Push notifications not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="pp-container">
      <h2 className="pp-title">
        <Bell size={20} />
        Push Notifications
      </h2>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="pp-stats">
          <div className="pp-stat">
            <span className="pp-stat__value">{stats.total || 0}</span>
            <span className="pp-stat__label">Total Subscribers</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat__value">{stats.customers || 0}</span>
            <span className="pp-stat__label">Customers</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat__value">{stats.admins || 0}</span>
            <span className="pp-stat__label">Admins</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat__value">{stats.active || 0}</span>
            <span className="pp-stat__label">Active (30d)</span>
          </div>
        </div>
      )}

      {/* ── This Device ────────────────────────────────────────────────────── */}
      <div className="pp-card">
        <h3 className="pp-card__title">This Device</h3>

        {permission === 'denied' ? (
          <div className="pp-blocked">
            <XCircle size={16} color="#ef4444" />
            <span>Blocked — enable in browser settings</span>
          </div>
        ) : (
          <div className="pp-device-row">
            <div className="pp-device-status">
              {isSubscribed
                ? <><BellRing size={16} className="pp-bell-active" /> Notifications <strong>ON</strong></>
                : <><BellOff size={16} color="#9ca3af" /> Notifications <strong>OFF</strong></>
              }
            </div>
            <div className="pp-device-actions">
              {isSubscribed ? (
                <>
                  <button
                    className="pp-btn pp-btn--test"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting
                      ? <Loader2 size={14} className="pp-spin" />
                      : <Zap size={14} />
                    }
                    {isTesting ? 'Sending...' : 'Test'}
                  </button>
                  <button
                    className="pp-btn pp-btn--unsub"
                    onClick={unsubscribe}
                    disabled={isLoading}
                  >
                    Disable
                  </button>
                </>
              ) : (
                <button
                  className="pp-btn pp-btn--sub"
                  onClick={subscribe}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <><Loader2 size={14} className="pp-spin" /> Enabling...</>
                    : <><Bell size={14} /> Enable</>
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`pp-result pp-result--${testResult}`}>
            {testResult === 'success'
              ? <><CheckCircle size={14} /> Test notification sent!</>
              : <><XCircle size={14} /> Failed to send test</>
            }
          </div>
        )}
        {error && <p className="pp-error">{error}</p>}
      </div>

      {/* ── Broadcast Panel ────────────────────────────────────────────────── */}
      <div className="pp-card">
        <h3 className="pp-card__title">
          <Send size={15} />
          Broadcast to All Customers
        </h3>

        {/* Presets */}
        <div className="pp-presets">
          {presets.map((p, i) => (
            <button
              key={i}
              className="pp-preset"
              onClick={() => setBroadcastForm({
                title: p.title,
                body:  p.body,
                url:   p.url
              })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleBroadcast} className="pp-form">
          <div className="pp-field">
            <label>Title *</label>
            <input
              type="text"
              value={broadcastForm.title}
              onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 🔥 Flash Sale!"
              maxLength={80}
              required
            />
            <span className="pp-char">{broadcastForm.title.length}/80</span>
          </div>

          <div className="pp-field">
            <label>Message *</label>
            <textarea
              value={broadcastForm.body}
              onChange={e => setBroadcastForm(f => ({ ...f, body: e.target.value }))}
              placeholder="e.g. Get 30% off all nail sets today only!"
              maxLength={200}
              rows={3}
              required
            />
            <span className="pp-char">{broadcastForm.body.length}/200</span>
          </div>

          <div className="pp-field">
            <label>Link URL</label>
            <input
              type="url"
              value={broadcastForm.url}
              onChange={e => setBroadcastForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://nagnail.lk/products"
            />
          </div>

          {/* Preview */}
          {(broadcastForm.title || broadcastForm.body) && (
            <div className="pp-preview">
              <span className="pp-preview__label">Preview</span>
              <div className="pp-preview__notif">
                <div className="pp-preview__icon">💅</div>
                <div className="pp-preview__text">
                  <strong>{broadcastForm.title || 'Title'}</strong>
                  <span>{broadcastForm.body || 'Message'}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="pp-btn pp-btn--broadcast"
            disabled={isSending || !broadcastForm.title || !broadcastForm.body}
          >
            {isSending
              ? <><Loader2 size={16} className="pp-spin" /> Sending to {stats?.customers || 0} customers...</>
              : <><Users size={16} /> Broadcast to {stats?.customers || 0} Customers</>
            }
          </button>
        </form>

        {/* Broadcast result */}
        {sendResult && (
          <div className={`pp-result ${sendResult.sent > 0 ? 'pp-result--success' : 'pp-result--error'}`}>
            {sendResult.sent > 0
              ? <><CheckCircle size={14} /> Sent to {sendResult.sent} subscribers. {sendResult.failed > 0 ? `(${sendResult.failed} failed)` : ''}</>
              : <><XCircle size={14} /> No active subscribers to notify</>
            }
          </div>
        )}
      </div>

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        .pp-container { font-family: system-ui, sans-serif; }
        .pp-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          color: #111;
          margin: 0 0 20px;
        }
        /* Stats */
        .pp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .pp-stat {
          background: #f9fafb;
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }
        .pp-stat__value {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: #7c3aed;
        }
        .pp-stat__label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
          display: block;
        }
        /* Cards */
        .pp-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .pp-card__title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          margin: 0 0 16px;
        }
        /* Device row */
        .pp-device-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pp-device-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
        }
        .pp-device-actions {
          display: flex;
          gap: 8px;
        }
        .pp-blocked {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #ef4444;
        }
        .pp-bell-active {
          color: #22c55e;
          animation: bellRing 2s ease infinite;
        }
        /* Buttons */
        .pp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pp-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .pp-btn--sub {
          background: linear-gradient(135deg, #7c3aed, #c44dff);
          color: #fff;
        }
        .pp-btn--sub:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124,58,237,0.3);
        }
        .pp-btn--unsub {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fecaca;
        }
        .pp-btn--test {
          background: #eff6ff;
          color: #3b82f6;
          border: 1px solid #bfdbfe;
        }
        .pp-btn--broadcast {
          width: 100%;
          justify-content: center;
          padding: 12px;
          background: linear-gradient(135deg, #7c3aed, #c44dff);
          color: #fff;
          border-radius: 10px;
          font-size: 14px;
          margin-top: 4px;
        }
        .pp-btn--broadcast:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,0.3);
        }
        /* Presets */
        .pp-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        .pp-preset {
          padding: 5px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          font-size: 12px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pp-preset:hover {
          background: #ede9fe;
          border-color: #7c3aed;
          color: #7c3aed;
        }
        /* Form */
        .pp-form { display: flex; flex-direction: column; gap: 12px; }
        .pp-field { display: flex; flex-direction: column; gap: 4px; position: relative; }
        .pp-field label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pp-field input,
        .pp-field textarea {
          padding: 9px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .pp-field input:focus,
        .pp-field textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }
        .pp-char {
          position: absolute;
          right: 10px;
          bottom: 8px;
          font-size: 10px;
          color: #9ca3af;
        }
        /* Preview */
        .pp-preview {
          background: #f9fafb;
          border-radius: 10px;
          padding: 12px;
        }
        .pp-preview__label {
          font-size: 10px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 8px;
        }
        .pp-preview__notif {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff;
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .pp-preview__icon { font-size: 24px; }
        .pp-preview__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pp-preview__text strong {
          font-size: 13px;
          color: #111;
        }
        .pp-preview__text span {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.4;
        }
        /* Results / Errors */
        .pp-result {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-top: 12px;
        }
        .pp-result--success { background: #f0fdf4; color: #16a34a; }
        .pp-result--error   { background: #fef2f2; color: #ef4444; }
        .pp-error {
          font-size: 12px;
          color: #ef4444;
          margin-top: 8px;
        }
        .pp-unsupported {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px;
          color: #9ca3af;
          background: #f9fafb;
          border-radius: 10px;
        }
        /* Animations */
        .pp-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          10%      { transform: rotate(14deg); }
          20%      { transform: rotate(-8deg); }
          30%      { transform: rotate(10deg); }
          40%      { transform: rotate(0deg); }
        }
        @media (max-width: 640px) {
          .pp-stats { grid-template-columns: repeat(2, 1fr); }
          .pp-device-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
