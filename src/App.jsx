import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ActivePortalProvider } from '@/lib/ActivePortalContext';
import MobileLayout from '@/components/MobileLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import PortalRouter from '@/components/PortalRouter';
import EmployeeSchedule from '@/pages/EmployeeSchedule';
import MapPortal from '@/pages/MapPortal';
import GreEnergyLinks from '@/pages/GreEnergyLinks';

const AuthenticatedApp = () => {
  const { isLoadingAuth, user } = useAuth();

  if (isLoadingAuth) {
    return <div style={{ minHeight: '100vh', background: '#0a120f', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#0a120f', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Not authenticated</div>;
  }

  return (
    <ErrorBoundary>
      <MobileLayout>
        <Routes>
          <Route path="/" element={<PortalRouter />} />
          <Route path="/schedule" element={<EmployeeSchedule />} />
          <Route path="/map-portal" element={<MapPortal />} />
          <Route path="/greenergy-links" element={<GreEnergyLinks />} />
        </Routes>
      </MobileLayout>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <ActivePortalProvider>
            <AuthenticatedApp />
          </ActivePortalProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App