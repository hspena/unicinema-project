import React, { useState, useEffect } from 'react';
import { subscribeToSnacks, Snack } from '../services/snackService';
import { BookingSnack } from '../services/bookingService';
import { IconGlyph, Plus, Minus, Popcorn } from '../utils/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const snacksTotal = (snacks: BookingSnack[] = []): number =>
  snacks.reduce((sum, s) => sum + s.price * s.qty, 0);

export const snacksCount = (snacks: BookingSnack[] = []): number =>
  snacks.reduce((sum, s) => sum + s.qty, 0);

// ─── Interactive selector ─────────────────────────────────────────────────────
// Controlled component. Prompts the patron whether they want snacks; if yes,
// lets them pick quantities of any available snack.

interface SnackSelectorProps {
  value:    BookingSnack[];
  onChange: (snacks: BookingSnack[]) => void;
}

const SnackSelector = ({ value, onChange }: SnackSelectorProps) => {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  // Default the prompt open when items are already chosen (e.g. when stepping back).
  const [wantSnacks, setWantSnacks] = useState<boolean | null>(value.length > 0 ? true : null);

  useEffect(() => subscribeToSnacks(setSnacks), []);

  const available = snacks
    .filter(s => s.available && s.stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const qtyOf = (id: string) => value.find(s => s.snackId === id)?.qty ?? 0;

  const setQty = (snack: Snack, qty: number) => {
    const clamped = Math.max(0, Math.min(qty, snack.stock));
    const others  = value.filter(s => s.snackId !== snack.id);
    if (clamped === 0) { onChange(others); return; }
    onChange([
      ...others,
      { snackId: snack.id, name: snack.name, emoji: snack.emoji, price: snack.price, qty: clamped },
    ]);
  };

  const total = snacksTotal(value);

  return (
    <div>
      <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Popcorn size={16} /> Would you like any snacks?
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Add snacks to your order — they'll be prepared for you at check-in.
      </div>

      {/* Yes / No prompt */}
      <div className="login-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`login-tab ${wantSnacks === true ? 'active' : ''}`}
          onClick={() => setWantSnacks(true)}
          type="button"
        >
          Yes, add snacks
        </button>
        <button
          className={`login-tab ${wantSnacks === false ? 'active' : ''}`}
          onClick={() => { setWantSnacks(false); onChange([]); }}
          type="button"
        >
          No, thanks
        </button>
      </div>

      {wantSnacks === true && (
        available.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No snacks are available right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {available.map(snack => {
              const qty = qtyOf(snack.id);
              return (
                <div
                  key={snack.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 'var(--radius)',
                    border: `1px solid ${qty > 0 ? 'var(--gold)' : 'var(--border)'}`,
                    background: qty > 0 ? 'var(--gold-dim)' : 'var(--navy)',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface-raised)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconGlyph iconKey={snack.emoji} size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{snack.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      RM {snack.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setQty(snack, qty - 1)}
                      disabled={qty === 0}
                      style={stepBtn(qty === 0)}
                    ><Minus size={14} /></button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600, fontSize: '0.86rem' }}>{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(snack, qty + 1)}
                      disabled={qty >= snack.stock}
                      style={stepBtn(qty >= snack.stock)}
                    ><Plus size={14} /></button>
                  </div>
                </div>
              );
            })}

            {total > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)',
                fontSize: '0.82rem',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Snacks subtotal</span>
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>RM {total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 28, height: 28, borderRadius: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid var(--border)',
  background: 'var(--surface-raised)',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

// ─── Read-only summary ────────────────────────────────────────────────────────
// Used in confirmation screens and the staff check-in view so staff know what
// to prepare.

export const SnackSummary = ({
  snacks, compact = false,
}: {
  snacks: BookingSnack[];
  compact?: boolean;
}) => {
  if (!snacks || snacks.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 3 : 6 }}>
      {snacks.map(s => (
        <div key={s.snackId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: compact ? '0.76rem' : '0.82rem' }}>
          <IconGlyph iconKey={s.emoji} size={compact ? 13 : 16} />
          <span style={{ flex: 1 }}>{s.name}</span>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>× {s.qty}</span>
          {!compact && (
            <span style={{ color: 'var(--text-muted)', minWidth: 64, textAlign: 'right' }}>
              RM {(s.price * s.qty).toFixed(2)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default SnackSelector;
