import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
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

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="productivity" element={<Productivity />} />
                <Route path="forecasting" element={<Forecasting />} />
                <Route path="simulation" element={<Simulation />} />
                <Route path="profile" element={<Profile />} />
                <Route path="financial" element={<Financial />} />
                <Route path="study" element={<Study />} />
                <Route path="habits" element={<Habits />} />
                <Route path="activity" element={<ActivityHistory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
