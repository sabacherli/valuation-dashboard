import { usePortfolioUpdates } from '../hooks/usePortfolioUpdates';
import { PortfolioProvider } from '../contexts/PortfolioContext';
import { useToast } from '../components/ui/use-toast';
import { useEffect } from 'react';

// Allow overriding via environment variable VITE_SSE_URL.
// Default to Vite proxy path that forwards to valuation-service /stream.
export const SSE_URL = (import.meta as any).env?.VITE_SSE_URL ?? '/api/stream';

interface PortfolioUpdateProviderProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

export function PortfolioUpdateProvider({ 
  children, 
  onError 
}: PortfolioUpdateProviderProps) {
  const { toast } = useToast();
  const { data, error, isConnected, refresh } = usePortfolioUpdates(SSE_URL);

  useEffect(() => {
    if (error) {
      console.error('Portfolio update error:', error);
      
      // Show toast notification
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect to portfolio updates',
        variant: 'destructive',
      });
      
      // Call error handler if provided
      if (onError) {
        onError(error);
      }
    }
  }, [error, toast, onError]);

  useEffect(() => {
    if (isConnected) {
      console.log('Successfully connected to portfolio updates');
      toast({
        title: 'Connected',
        description: 'Successfully connected to real-time updates',
        variant: 'default',
      });
    }
  }, [isConnected, toast]);
  
  return (
    <PortfolioProvider 
      initialData={data}
      isLoading={!isConnected && !error}
      error={error}
      refresh={refresh}
    >
      {children}
    </PortfolioProvider>
  );
}
