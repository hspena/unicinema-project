import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

/**
 * Live camera QR scanner. Mounts when `active` is true, starts the rear camera,
 * and fires `onScan` once with the decoded text. The parent decides what to do
 * with the value (e.g. look up a ticket code and check the guest in).
 */
const QrScanner = ({
  active,
  onScan,
  onError,
}: {
  active:   boolean;
  onScan:   (text: string) => void;
  onError?: (message: string) => void;
}) => {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`).current;
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const handledRef  = useRef(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'failed'>('idle');

  useEffect(() => {
    if (!active) return;
    handledRef.current = false;
    setStatus('starting');

    const scanner = new Html5Qrcode(containerId, /* verbose */ false);
    scannerRef.current = scanner;

    // Defer the actual camera start so React 18 StrictMode's synchronous
    // mount→unmount→mount cycle (dev only) never starts the camera on the
    // throwaway first mount. Starting then immediately tearing down the video
    // element triggers a "play() request was interrupted" error.
    let startPromise: Promise<void> = Promise.resolve();
    const timer = setTimeout(() => {
      startPromise = scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScan(decodedText.trim());
          },
          () => { /* per-frame decode failures are normal; ignore */ },
        )
        .then(() => setStatus('scanning'))
        .catch((err) => {
          setStatus('failed');
          onError?.(
            err?.toString?.().includes('NotAllowed')
              ? 'Camera permission denied. Allow camera access or type the code instead.'
              : 'Could not start the camera. Type the code instead.'
          );
        });
    }, 80);

    return () => {
      clearTimeout(timer);
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      // Wait for start to finish (or fail) before attempting to stop, so we
      // never call stop() while the camera is still spinning up.
      startPromise.finally(() => {
        const state = s.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          s.stop().then(() => s.clear()).catch(() => { /* already stopped */ });
        } else {
          try { s.clear(); } catch { /* nothing to clear */ }
        }
      });
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  return (
    <div>
      <div
        id={containerId}
        style={{
          width: '100%', maxWidth: 300, margin: '0 auto',
          borderRadius: 'var(--radius)', overflow: 'hidden',
          border: '1px solid var(--border)', background: '#000',
        }}
      />
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
        {status === 'starting' && 'Starting camera…'}
        {status === 'scanning' && 'Point the camera at the ticket QR code.'}
        {status === 'failed'   && 'Camera unavailable.'}
      </div>
    </div>
  );
};

export default QrScanner;
