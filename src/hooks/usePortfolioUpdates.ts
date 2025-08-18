import { useState, useEffect, useCallback, useRef } from 'react';
import type { PortfolioUpdate, Position } from '../types/portfolio';

// Map backend payload (portfolio_value, positions: { symbol, quantity, price, value })
// to the frontend PortfolioUpdate shape expected by the UI
function mapToPortfolioUpdate(raw: any): PortfolioUpdate {
  // If payload already matches expected shape, return it
  if (raw && typeof raw === 'object' && 'totalValue' in raw && 'positions' in raw) {
    return raw as PortfolioUpdate;
  }

  const timestamp: string = String(raw?.timestamp ?? new Date().toISOString());
  const totalValue: number = Number(raw?.portfolio_value ?? raw?.totalValue ?? 0);

  const positions: Position[] = Array.isArray(raw?.positions)
    ? raw.positions.map((p: any, idx: number) => {
        const symbol = String(p?.symbol ?? `POS_${idx}`);
        const quantity = Number(p?.quantity ?? 0);
        const price = Number(p?.price ?? p?.currentPrice ?? 0);
        const value = Number(p?.value ?? p?.marketValue ?? quantity * price);
        const averagePrice = Number(p?.average_cost ?? p?.averageCost ?? p?.averagePrice ?? price);
        const pnl = Number(p?.pnl ?? 0);
        const pnlPercent = Number(p?.pnl_percent ?? p?.pnlPercent ?? 0);
        return {
          id: String(p?.id ?? symbol),
          symbol,
          quantity,
          averagePrice,
          currentPrice: price,
          marketValue: value,
          pnl,
          pnlPercent,
          sector: p?.sector,
          assetClass: p?.assetClass,
          currency: p?.currency,
        } as Position;
      })
    : [];

  return {
    id: raw?.id,
    timestamp,
    totalValue,
    cashBalance: Number(raw?.cashBalance ?? 0),
    positions,
    dailyChange: {
      amount: Number(raw?.dailyChange?.amount ?? 0),
      percent: Number(raw?.dailyChange?.percent ?? 0),
    },
    riskMetrics: raw?.riskMetrics,
    performanceMetrics: raw?.performanceMetrics,
    lastUpdated: raw?.lastUpdated ?? timestamp,
  } as PortfolioUpdate;
}

interface UsePortfolioUpdatesReturn {
  data: PortfolioUpdate | null;
  error: Error | null;
  isConnected: boolean;
  reconnectAttempts: number;
  refresh: () => void;
}

export function usePortfolioUpdates(apiUrl: string): UsePortfolioUpdatesReturn {
  const [data, setData] = useState<PortfolioUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connection
    cleanup();

    try {
      eventSourceRef.current = new EventSource(apiUrl);
      const eventSource = eventSourceRef.current;

      eventSource.onopen = () => {
        console.log('SSE connection established');
        setIsConnected(true);
        setReconnectAttempts(0);
        setError(null);
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data) as any;

          // Map backend payload to frontend shape
          const mapped: PortfolioUpdate = mapToPortfolioUpdate(raw);

          setData(prevData => {
            // Only update if the data has changed
            if (JSON.stringify(prevData) !== JSON.stringify(mapped)) {
              return mapped;
            }
            return prevData;
          });
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError(err instanceof Error ? err : new Error('Failed to parse update'));
        }
      };

      eventSource.onerror = (event: Event) => {
        console.error('SSE error:', event);
        const error = new Error('Connection to portfolio updates failed');
        setError(error);
        setIsConnected(false);
        
        // Clean up the current connection
        cleanup();
        
        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        const timeoutId = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
        reconnectTimeoutRef.current = timeoutId;
      };

      // Return cleanup function
      return cleanup;
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect to updates'));
      return cleanup;
    }
  }, [apiUrl, reconnectAttempts, cleanup]);

  // Set up the connection on mount and clean up on unmount
  useEffect(() => {
    const cleanupFn = connect();
    return () => {
      cleanupFn();
    };
  }, [connect]);

  // Refresh function to manually reconnect
  const refresh = useCallback(() => {
    setReconnectAttempts(0);
    setError(null);
    connect();
  }, [connect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    data,
    error,
    isConnected,
    reconnectAttempts,
    refresh,
  };
}
