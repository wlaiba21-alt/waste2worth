import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App } from './App';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'; // Use dummy to prevent errors
const root = createRoot(document.getElementById('root'));

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

root.render(
  <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
);