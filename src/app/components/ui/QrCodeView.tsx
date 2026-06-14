import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a scannable QR code image for the given text value.
 * Used on tickets so staff/manager can scan to check a moviegoer in.
 */
const QrCodeView = ({ value, size = 200 }: { value: string; size?: number }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let active = true;
    if (!value) { setDataUrl(''); return; }
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f1628', light: '#ffffff' },
    })
      .then(url => { if (active) { setDataUrl(url); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [value, size]);

  if (error) {
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
        Could not render QR code.
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex', padding: 12, background: '#fff',
      borderRadius: 'var(--radius)', border: '1px solid var(--border)',
      width: size + 24, height: size + 24,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {dataUrl
        ? <img src={dataUrl} alt={`QR code for ${value}`} width={size} height={size} />
        : <span style={{ fontSize: '0.75rem', color: '#888' }}>Generating…</span>}
    </div>
  );
};

export default QrCodeView;
