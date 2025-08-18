import { createContext, useContext, type ReactNode } from 'react';
import type { PortfolioUpdate, RiskMetrics, PerformanceMetrics, Position } from '../types/portfolio';

export interface PortfolioContextType {
  portfolio: PortfolioUpdate | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  riskMetrics?: RiskMetrics;
  performanceMetrics?: PerformanceMetrics;
  positions?: Position[];
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
  initialData?: PortfolioUpdate | null;
  isLoading?: boolean;
  error?: Error | null;
  refresh?: () => void;
  riskMetrics?: RiskMetrics;
  performanceMetrics?: PerformanceMetrics;
}

export function PortfolioProvider({ 
  children,
  initialData = null,
  isLoading = false,
  error = null,
  refresh = () => {},
  riskMetrics,
  performanceMetrics
}: PortfolioProviderProps) {
  const value = {
    portfolio: initialData,
    isLoading,
    error,
    refresh,
    riskMetrics: riskMetrics || initialData?.riskMetrics,
    performanceMetrics: performanceMetrics || initialData?.performanceMetrics,
    positions: initialData?.positions
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
