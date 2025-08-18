import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PortfolioUpdateProvider } from './providers/PortfolioUpdateProvider';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/theme-provider';
import DashboardLayout from './layouts/DashboardLayout';
import PortfolioPage from './pages/PortfolioPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './components/ErrorFallback/ErrorFallback';
import { TestStyles } from './components/TestStyles';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PortfolioUpdateProvider>
            {/* Test component to verify Tailwind styles */}
            <div className="p-4">
              <TestStyles />
            </div>
            
            <Routes>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<PortfolioPage />} />
                <Route path="risk" element={<RiskAnalysisPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
            <Toaster />
            <ReactQueryDevtools initialIsOpen={false} />
          </PortfolioUpdateProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
