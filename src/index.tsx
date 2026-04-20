import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css'
import App from './app/App';
import { ThemeProvider } from './app/context/ThemeContext';
import { AuthProvider }  from './app/context/AuthContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
