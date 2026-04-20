import React from 'react';
import { useAuth }        from './context/AuthContext';
import { AppLayout }      from './components/Layout';
import Login              from './pages/Login';
import { resolveView }    from './routes';

const App = () => {
  const { isLoggedIn, isLoading, currentView, role } = useAuth();


  // Show loading spinner while Firebase checks auth state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navy)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>🎬</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
          Loading UniCinema…
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  // Redirect Cinema Room's "dashboard" view to cm-dashboard
  const effectiveView =
    role === 'Cinema Room' && currentView === 'dashboard'
      ? 'cm-dashboard'
      : currentView;

  return (
    <AppLayout>
      {resolveView(effectiveView)}
    </AppLayout>
  );
};



export default App;
