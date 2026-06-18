import React, { useState } from 'react';
import { Modal, Button } from './ui';
import { InputField } from './ui/FormFields';
import {
  CreditCard, Lock, ShieldCheck, Hourglass, XCircle,
} from '../utils/icons';

// ─── Simulated payment gateway ──────────────────────────────────────────────
// This is a self-contained mock card gateway for the booking flow. No real card
// data leaves the browser and no charge is made — it validates the card fields,
// simulates network settlement, and returns a transaction reference on success.
// Swap `settlePayment` for a real PSP (Stripe, Billplz, etc.) call when wiring a
// backend; the modal contract (onSuccess(ref) / onClose) stays the same.

type Stage = 'form' | 'processing' | 'error';

interface PaymentModalProps {
  open:      boolean;
  amount:    number;            // amount in RM
  movieTitle: string;
  seatCount: number;
  onClose:   () => void;
  onSuccess: (paymentRef: string) => void;
}

// ─── Field formatting helpers ───────────────────────────────────────────────
const formatCardNumber = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const luhnValid = (digits: string): boolean => {
  if (digits.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
};

const expiryValid = (exp: string): boolean => {
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year  = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const end = new Date(year, month, 1); // first day after expiry month
  return end > new Date();
};

const genPaymentRef = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  return 'PAY-' + Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const PaymentModal = ({
  open, amount, movieTitle, seatCount, onClose, onSuccess,
}: PaymentModalProps) => {
  const [stage,    setStage]    = useState<Stage>('form');
  const [name,     setName]     = useState('');
  const [number,   setNumber]   = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [cvv,      setCvv]      = useState('');
  const [error,    setError]    = useState('');

  const reset = () => {
    setStage('form'); setName(''); setNumber(''); setExpiry(''); setCvv(''); setError('');
  };

  const handleClose = () => { if (stage !== 'processing') { reset(); onClose(); } };

  const digits = number.replace(/\D/g, '');

  const validate = (): string | null => {
    if (!name.trim())            return 'Enter the name on the card.';
    if (!luhnValid(digits))      return 'That card number looks invalid.';
    if (!expiryValid(expiry))    return 'Enter a valid, unexpired expiry date.';
    if (!/^\d{3,4}$/.test(cvv))  return 'Enter the 3-digit security code.';
    return null;
  };

  const handlePay = () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError('');
    setStage('processing');
    // Simulate the gateway settling the transaction.
    setTimeout(() => {
      onSuccess(genPaymentRef());
      reset();
    }, 1600);
  };

  return (
    <Modal
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={16} /> Secure Payment
        </span>
      }
      open={open}
      onClose={handleClose}
      footer={
        stage === 'form' ? (
          <>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handlePay} icon={<Lock size={14} />}>
              Pay RM {amount.toFixed(2)}
            </Button>
          </>
        ) : stage === 'error' ? (
          <Button onClick={() => setStage('form')} icon={<CreditCard size={14} />}>
            Try Again
          </Button>
        ) : null
      }
    >
      {/* ── Order summary ── */}
      <div style={{
        padding: '12px 14px', marginBottom: 16, background: 'var(--navy)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 600 }}>{movieTitle}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {seatCount} seat{seatCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
          RM {amount.toFixed(2)}
        </div>
      </div>

      {stage === 'processing' ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 10, color: 'var(--gold)' }}>
            <Hourglass size={30} className="spin" />
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>Processing payment…</div>
          <div style={{ fontSize: '0.76rem', marginTop: 4 }}>Please don’t close this window.</div>
        </div>
      ) : stage === 'error' ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ marginBottom: 10, color: 'var(--danger)' }}><XCircle size={30} /></div>
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Payment Declined</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{error}</div>
        </div>
      ) : (
        <>
          <InputField
            label="Name on Card"
            placeholder="JOHN A DOE"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <InputField
            label="Card Number"
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            value={number}
            onChange={e => setNumber(formatCardNumber(e.target.value))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InputField
              label="Expiry (MM/YY)"
              placeholder="08/28"
              inputMode="numeric"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
            />
            <InputField
              label="CVV"
              placeholder="123"
              inputMode="numeric"
              type="password"
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          {error && (
            <div style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: 6 }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 14,
            fontSize: '0.72rem', color: 'var(--text-muted)',
          }}>
            <ShieldCheck size={13} />
            Simulated gateway — no real card is charged.
          </div>
        </>
      )}
    </Modal>
  );
};

export default PaymentModal;
