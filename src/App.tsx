import { Routes, Route } from 'react-router-dom';
import { PortfolioUpdateProvider } from './providers/PortfolioUpdateProvider';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/theme-provider';
import DashboardLayout from './layouts/DashboardLayout';
import PortfolioPage from './pages/PortfolioPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import SettingsPage from './pages/SettingsPage';
import InstrumentsPage from './pages/InstrumentsPage';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './components/ErrorFallback/ErrorFallback';

// React Query provider and devtools are configured in src/main.tsx

function App() {
  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    console.error('Error caught by error boundary:', error, info);
    // You can also log errors to an error reporting service here
  };

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <ThemeProvider>
        <PortfolioUpdateProvider>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<PortfolioPage />} />
              <Route path="instruments" element={<InstrumentsPage />} />
              <Route path="risk" element={<RiskAnalysisPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          <Toaster />
        </PortfolioUpdateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
