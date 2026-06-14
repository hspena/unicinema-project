import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_VIEWS } from '../utils/helpers';
import { Film } from '../utils/icons';

const NotFound = () => {
  const { role, setView } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--navy)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <Film size={80} color="var(--gold)" />
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--gold)' }}>
        404 — Scene Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        className="btn btn-primary"
        onClick={() => setView(DEFAULT_VIEWS[role])}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default NotFound;
