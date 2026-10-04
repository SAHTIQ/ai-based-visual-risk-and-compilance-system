import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Productivity } from './pages/Productivity';
import { Forecasting } from './pages/Forecasting';
import { Profile } from './pages/Profile';
import { Financial } from './pages/Financial';
import { Study } from './pages/Study';
import { Habits } from './pages/Habits';
import { ActivityHistory } from './pages/ActivityHistory';
import { Settings } from './pages/Settings';
import { Simulation } from './pages/Simulation';
import { AIAssistant } from './pages/AIAssistant';
import { HelpDocs } from './pages/HelpDocs';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '303291914892-k30tt3k08l53vv7druketbr10tceuqcn.apps.googleusercontent.com';

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="productivity" element={<Productivity />} />
                <Route path="forecasting" element={<Forecasting />} />
                <Route path="simulation" element={<Simulation />} />
                <Route path="ai-assistant" element={<AIAssistant />} />
                <Route path="profile" element={<Profile />} />
                <Route path="financial" element={<Financial />} />
                <Route path="study" element={<Study />} />
                <Route path="habits" element={<Habits />} />
                <Route path="activity" element={<ActivityHistory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help-docs" element={<HelpDocs />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
  );
}

export default App;
