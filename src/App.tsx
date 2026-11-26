import React, { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { LoadingState } from './components/StateBlocks';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { normalizeAdminRoute } from './lib/validation';

// Lazy-loaded hidden admin console — never referenced anywhere in public or researcher UI
const AdminPortalPage = lazy(() => import('./pages/AdminPortalPage'));

const ADMIN_ROUTE_PATH = normalizeAdminRoute(import.meta.env.VITE_ADMIN_ROUTE);

function ProtectedResearcherRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LoadingState label="Restoring your TaxaTrace session..." rows={3} />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

function AutostartHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loginDemoResearcher } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('autostart') === '1' && !user) {
      loginDemoResearcher().then(() => navigate('/dashboard', { replace: true }));
    }
  }, [location.search, user, loginDemoResearcher, navigate]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <AutostartHandler />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedResearcherRoute>
                      <DashboardPage />
                    </ProtectedResearcherRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedResearcherRoute>
                      <ProfilePage />
                    </ProtectedResearcherRoute>
                  }
                />
                <Route
                  path={ADMIN_ROUTE_PATH}
                  element={
                    <Suspense
                      fallback={
                        <div className="min-h-screen bg-[#070B0D] flex items-center justify-center text-xs font-mono text-[#7F979E]">
                          Loading control plane...
                        </div>
                      }
                    >
                      <AdminPortalPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
